import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Simple Login Endpoint
 * Authenticates user and returns JWT token
 */
export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    const { email, password } = body || {}

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const { data: user, error: userError } = await supabaseAdmin
      .from('custom_users')
      .select('id, email, password_hash, business_id, is_active, first_name, last_name, role, job_title, is_admin')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, message: 'Account is disabled' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get business info
    let business = null
    if (user.business_id) {
      const { data: businessData } = await supabaseAdmin
        .from('businesses')
        .select('id, business_name, business_type')
        .eq('id', user.business_id)
        .single()
      
      business = businessData
    }

    // Update last login
    await supabaseAdmin
      .from('custom_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Generate JWT token
    const resolvedRole =
      user.role ||
      (user.is_admin ? 'admin' : user.business_id ? 'owner' : 'user')

    const token = JWTManager.createUserToken(
      user.id,
      user.business_id || '',
      user.email,
      resolvedRole
    )

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          business_id: user.business_id,
          role: resolvedRole,
          job_title: user.job_title
        },
        business: business ? {
          id: business.id,
          business_name: business.business_name,
          business_type: business.business_type
        } : null
      }
    })
  } catch (error) {
    logger.error('Login error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}

