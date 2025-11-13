import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const sanitizePhoneNumber = (input: unknown): string | null => {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/[^0-9]/g, '')
  if (digits.length < 10) {
    return null
  }

  if (trimmed.startsWith('+')) {
    return `+${digits}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  if (digits.length === 10) {
    return `+1${digits}`
  }

  return `+${digits}`
}

/**
 * Admin Phone Number Management
 * 
 * GET: View all phone numbers in inventory (available, assigned, suspended)
 * POST: Add phone numbers to inventory manually
 * PATCH: Update phone number status
 * DELETE: Remove phone number from inventory
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'available', 'assigned', 'suspended'
    const businessId = searchParams.get('businessId')

    // Build query
    let query = supabaseAdmin
      .from('toll_free_numbers')
      .select('id, number, status, assigned_to, business_name, assigned_at, created_at, updated_at')

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (businessId) {
      query = query.eq('assigned_to', businessId)
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false })

    const { data: numbers, error } = await query

    if (error) {
      logger.error('Failed to fetch phone numbers', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch phone numbers' },
        { status: 500 }
      )
    }

    // Get statistics
    const { data: stats } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('status')

    const statistics = {
      total: stats?.length || 0,
      available: stats?.filter(n => n.status === 'available').length || 0,
      assigned: stats?.filter(n => n.status === 'assigned').length || 0,
      suspended: stats?.filter(n => n.status === 'suspended').length || 0
    }

    return NextResponse.json({
      success: true,
      numbers: numbers || [],
      statistics
    })

  } catch (error) {
    logger.error('Admin phone numbers GET failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    )
  }
}

/**
 * POST - Add phone numbers to inventory manually
 * Body: { numbers: string[] } - Array of phone numbers to add
 */
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { numbers } = body

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Expected array of phone numbers.' },
        { status: 400 }
      )
    }

    const sanitizedMap = new Map<string, string>()
    const invalidNumbers: string[] = []

    for (const raw of numbers) {
      const sanitized = sanitizePhoneNumber(raw)
      if (sanitized) {
        sanitizedMap.set(sanitized, sanitized)
      } else if (typeof raw === 'string') {
        invalidNumbers.push(raw.trim())
      }
    }

    if (sanitizedMap.size === 0) {
      return NextResponse.json(
        { error: 'No valid phone numbers detected after sanitization.', invalid: invalidNumbers },
        { status: 400 }
      )
    }

    const sanitizedNumbers = Array.from(sanitizedMap.keys())

    const { data: existingNumbers, error: existingError } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('number')
      .in('number', sanitizedNumbers)

    if (existingError) {
      logger.error('Failed to check existing phone numbers', { error: existingError.message })
      return NextResponse.json(
        { error: 'Failed to add phone numbers' },
        { status: 500 }
      )
    }

    const existingSet = new Set(existingNumbers?.map((n) => n.number) ?? [])
    const duplicates = sanitizedNumbers.filter((num) => existingSet.has(num))
    const newNumbers = sanitizedNumbers.filter((num) => !existingSet.has(num))

    let insertedCount = 0
    let insertedNumbers: string[] = []

    if (newNumbers.length > 0) {
      const rows = newNumbers.map((number) => ({
        number,
        status: 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data: inserted, error } = await supabaseAdmin
        .from('toll_free_numbers')
        .insert(rows)
        .select('number')

      if (error) {
        logger.error('Failed to add phone numbers', { error: error.message })
        return NextResponse.json(
          { error: 'Failed to add phone numbers' },
          { status: 500 }
        )
      }

      insertedCount = inserted?.length ?? 0
      insertedNumbers = inserted?.map((row) => row.number) ?? []
    }

    logger.info('Phone numbers processed for inventory', {
      adminId: adminAuth.userId,
      attempted: sanitizedNumbers.length,
      inserted: insertedCount,
      duplicates: duplicates.length,
      invalid: invalidNumbers.length
    })

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      duplicates: duplicates.length,
      invalid: invalidNumbers.length,
      numbers: {
        inserted: insertedNumbers,
        duplicates,
        invalid: invalidNumbers
      }
    })
  } catch (error) {
    logger.error('Admin phone numbers POST failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to add phone numbers' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update phone number status
 * Body: { id: string, status?: string, assigned_to?: string, business_name?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, status, assigned_to, business_name } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Phone number ID is required' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updates.status = status
    }
    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to
      if (assigned_to) {
        updates.assigned_at = new Date().toISOString()
      } else {
        updates.assigned_at = null
      }
    }
    if (business_name !== undefined) {
      updates.business_name = business_name
    }

    const { data: updated, error } = await supabaseAdmin
      .from('toll_free_numbers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update phone number', { error: error.message, id })
      return NextResponse.json(
        { error: 'Failed to update phone number' },
        { status: 500 }
      )
    }

    logger.info('Phone number updated', {
      id,
      status,
      adminId: adminAuth.userId
    })

    return NextResponse.json({
      success: true,
      number: updated
    })

  } catch (error) {
    logger.error('Admin phone numbers PATCH failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to update phone number' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove phone number from inventory
 * Query: ?id=uuid
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Phone number ID is required' },
        { status: 400 }
      )
    }

    // Check if number is assigned
    const { data: number } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('status, assigned_to')
      .eq('id', id)
      .single()

    if (number?.status === 'assigned' && number.assigned_to) {
      return NextResponse.json(
        { error: 'Cannot delete assigned phone number. Unassign it first.' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('toll_free_numbers')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Failed to delete phone number', { error: error.message, id })
      return NextResponse.json(
        { error: 'Failed to delete phone number' },
        { status: 500 }
      )
    }

    logger.info('Phone number deleted from inventory', {
      id,
      adminId: adminAuth.userId
    })

    return NextResponse.json({
      success: true,
      message: 'Phone number deleted successfully'
    })

  } catch (error) {
    logger.error('Admin phone numbers DELETE failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to delete phone number' },
      { status: 500 }
    )
  }
}

