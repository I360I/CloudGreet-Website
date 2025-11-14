import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Lead Management API
 * 
 * GET: List all leads with filtering and search
 * POST: Create a new lead
 * PATCH: Update lead status or details
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
    const status = searchParams.get('status') // 'new', 'contacted', 'qualified', 'converted', 'closed'
    const source = searchParams.get('source') // 'google_places', 'manual', 'referral', 'website'
    const search = searchParams.get('search') // Search by business_name, contact_name, email, phone
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query
    let query = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (source) {
      query = query.eq('source', source)
    }
    if (search) {
      // Search across multiple fields
      query = query.or(`business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: leads, error, count } = await query

    if (error) {
      logger.error('Failed to fetch leads', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    // Get statistics
    const { data: allLeads } = await supabaseAdmin
      .from('leads')
      .select('status')

    const statistics = {
      total: count || 0,
      new: allLeads?.filter(l => l.status === 'new').length || 0,
      contacted: allLeads?.filter(l => l.status === 'contacted').length || 0,
      qualified: allLeads?.filter(l => l.status === 'qualified').length || 0,
      converted: allLeads?.filter(l => l.status === 'converted').length || 0,
      closed: allLeads?.filter(l => l.status === 'closed').length || 0
    }

    return NextResponse.json({
      success: true,
      leads: leads || [],
      statistics,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    logger.error('Admin leads GET failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new lead
 * Body: {
 *   business_name: string (required)
 *   contact_name?: string
 *   phone: string (required)
 *   email?: string
 *   website?: string
 *   address?: string
 *   business_type?: string
 *   source?: 'google_places' | 'manual' | 'referral' | 'website' (default: 'manual')
 *   notes?: string
 *   estimated_revenue?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body?.business_name || !body?.phone) {
      return NextResponse.json(
        { error: 'business_name and phone are required' },
        { status: 400 }
      )
    }

    // Prepare lead data
    const leadData = {
      business_name: body.business_name,
      contact_name: body.contact_name || null,
      phone: body.phone,
      email: body.email || null,
      website: body.website || null,
      address: body.address || null,
      business_type: body.business_type || null,
      source: body.source || 'manual',
      notes: body.notes || null,
      estimated_revenue: body.estimated_revenue || null,
      status: 'new',
      // business_id can be null for admin-created leads (not tied to a specific business)
      business_id: body.business_id || null
    }

    // Insert lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select()
      .single()

    if (error) {
      logger.error('Failed to create lead', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to create lead', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      lead
    }, { status: 201 })

  } catch (error) {
    logger.error('Admin leads POST failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update lead status or details
 * Body: {
 *   id: string (required) - Lead ID
 *   status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed'
 *   contact_name?: string
 *   email?: string
 *   phone?: string
 *   website?: string
 *   address?: string
 *   business_type?: string
 *   notes?: string
 *   estimated_revenue?: number
 *   last_contact_date?: string (ISO date)
 *   next_follow_up_date?: string (ISO date)
 * }
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

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { error: 'Lead id is required' },
        { status: 400 }
      )
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (body.status) {
      updateData.status = body.status
    }
    if (body.contact_name !== undefined) {
      updateData.contact_name = body.contact_name
    }
    if (body.email !== undefined) {
      updateData.email = body.email
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone
    }
    if (body.website !== undefined) {
      updateData.website = body.website
    }
    if (body.address !== undefined) {
      updateData.address = body.address
    }
    if (body.business_type !== undefined) {
      updateData.business_type = body.business_type
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }
    if (body.estimated_revenue !== undefined) {
      updateData.estimated_revenue = body.estimated_revenue
    }
    if (body.last_contact_date) {
      updateData.last_contact_date = body.last_contact_date
    }
    if (body.next_follow_up_date) {
      updateData.next_follow_up_date = body.next_follow_up_date
    }

    // Update lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update lead', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to update lead', details: error.message },
        { status: 500 }
      )
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      lead
    })

  } catch (error) {
    logger.error('Admin leads PATCH failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

