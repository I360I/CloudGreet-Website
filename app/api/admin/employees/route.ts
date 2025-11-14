import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET - List all employees
 */
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'sales', 'manager', etc.
    const status = searchParams.get('status') // 'active', 'inactive'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('custom_users')
      .select('id, email, first_name, last_name, role, job_title, is_active, created_at, last_login, business_id')
      .in('role', ['sales', 'manager', 'employee'])
      .order('created_at', { ascending: false })

    if (role) {
      query = query.eq('role', role)
    }
    if (status) {
      query = query.eq('is_active', status === 'active')
    }

    query = query.range(offset, offset + limit - 1)

    const { data: employees, error, count } = await query

    if (error) {
      logger.error('Failed to fetch employees', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      employees: employees || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    logger.error('Admin employees GET failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new employee
 * Body: {
 *   email: string (required)
 *   password: string (required)
 *   first_name?: string
 *   last_name?: string
 *   role?: 'sales' | 'manager' | 'employee' (default: 'sales')
 *   job_title?: string
 * }
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

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    const { email, password, first_name, last_name, role = 'sales', job_title } = body || {}

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('custom_users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create auth user first (if using Supabase Auth)
    let authUserId: string | null = null
    try {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true, // Auto-confirm
        user_metadata: {
          first_name: first_name || '',
          last_name: last_name || ''
        }
      })

      if (authError) {
        logger.warn('Failed to create auth user, continuing with custom_users only', {
          error: authError.message
        })
      } else {
        authUserId = authUser.user.id
      }
    } catch (authErr) {
      logger.warn('Auth user creation skipped', {
        error: authErr instanceof Error ? authErr.message : 'Unknown'
      })
    }

    // Create custom_users record
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('custom_users')
      .insert({
        id: authUserId || undefined, // Use auth user ID if available, otherwise let DB generate
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: first_name || null,
        last_name: last_name || null,
        role: role,
        job_title: job_title || null,
        is_active: true,
        is_admin: false
      })
      .select()
      .single()

    if (userError) {
      logger.error('Failed to create employee', { error: userError.message })
      
      // Cleanup auth user if created
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {})
      }

      return NextResponse.json(
        { error: 'Failed to create employee', details: userError.message },
        { status: 500 }
      )
    }

    logger.info('Employee created by admin', {
      adminId: adminAuth.userId,
      employeeId: newUser.id,
      email: newUser.email,
      role: newUser.role
    })

    return NextResponse.json({
      success: true,
      employee: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        job_title: newUser.job_title,
        is_active: newUser.is_active
      }
    })
  } catch (error) {
    logger.error('Admin employee creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to create employee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update employee (activate/deactivate, change role, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
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
    const { employee_id, is_active, role, password } = body || {}

    if (!employee_id || typeof employee_id !== 'string') {
      return NextResponse.json(
        { error: 'Valid employee_id is required' },
        { status: 400 }
      )
    }

    // Verify employee exists and belongs to system (not another business)
    const { data: existingEmployee } = await supabaseAdmin
      .from('custom_users')
      .select('id, role')
      .eq('id', employee_id)
      .in('role', ['sales', 'manager', 'employee'])
      .single()

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const updates: Record<string, unknown> = {}
    
    if (typeof is_active === 'boolean') {
      updates.is_active = is_active
    }
    if (role && ['sales', 'manager', 'employee'].includes(role)) {
      updates.role = role
    }
    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        )
      }
      updates.password_hash = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    const { data: updatedEmployee, error } = await supabaseAdmin
      .from('custom_users')
      .update(updates)
      .eq('id', employee_id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update employee', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to update employee', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      employee: updatedEmployee
    })
  } catch (error) {
    logger.error('Admin employee update failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

