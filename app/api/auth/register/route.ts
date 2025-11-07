import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Full Registration Endpoint
 * Creates a user account and business with full details
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      password, 
      business_name, 
      business_type, 
      phone, 
      address,
      website 
    } = body

    // Validate required fields
    if (!email || !password || !business_name) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: email, password, business_name' } },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: { message: 'Password must be at least 8 characters long' } },
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
        { error: { message: 'An account with this email already exists' } },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('custom_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: '',
        last_name: '',
        is_active: true,
        is_admin: false
      })
      .select()
      .single()

    if (userError || !newUser) {
      logger.error('Failed to create user', { 
        error: userError instanceof Error ? userError.message : String(userError) 
      })
      return NextResponse.json(
        { error: { message: 'Failed to create user account' } },
        { status: 500 }
      )
    }

    // Create business
    const { data: newBusiness, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: newUser.id,
        business_name,
        business_type: business_type || 'general',
        email: email.toLowerCase(),
        phone: phone || null,
        phone_number: phone || null,
        address: address || null,
        website: website || null
      })
      .select()
      .single()

    if (businessError || !newBusiness) {
      // Rollback: delete user if business creation fails
      await supabaseAdmin.from('custom_users').delete().eq('id', newUser.id)
      logger.error('Failed to create business', { 
        error: businessError instanceof Error ? businessError.message : String(businessError) 
      })
      return NextResponse.json(
        { error: { message: 'Failed to create business' } },
        { status: 500 }
      )
    }

    // Update user with business_id
    await supabaseAdmin
      .from('custom_users')
      .update({ business_id: newBusiness.id })
      .eq('id', newUser.id)

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      business_id: newBusiness.id
    })
  } catch (error) {
    logger.error('Registration error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: { message: 'Registration failed. Please try again.' } },
      { status: 500 }
    )
  }
}

