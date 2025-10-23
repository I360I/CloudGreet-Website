import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Database not configured. Please contact support.'
      }, { status: 503 })
    }

    const body = await request.json()
    const { business_name, business_type, email, password, phone, address } = body

    // Basic validation
    if (!business_name || !email || !password || !phone || !address) {
      return NextResponse.json({
        success: false,
        message: 'All required fields must be filled'
      }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedEmail = email.toLowerCase().trim()
    const sanitizedPassword = password.trim()
    const sanitizedBusinessName = business_name.trim()
    const sanitizedPhone = phone.replace(/\D/g, '') // Remove non-digits

    // Check if JWT secret is configured
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-testing'

    // Create user using Supabase Auth API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password: sanitizedPassword,
      user_metadata: {
        first_name: sanitizedBusinessName.split(' ')[0] || sanitizedBusinessName,
        last_name: sanitizedBusinessName.split(' ').slice(1).join(' ') || '',
        phone: sanitizedPhone,
        is_admin: false
      },
      email_confirm: true
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json({
          success: false,
          message: 'An account with this email already exists'
        }, { status: 409 })
      }
      throw new Error(`User creation failed: ${authError.message}`)
    }

    const user = authUser.user

    // Create business record
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: user.id,
        business_name: sanitizedBusinessName,
        business_type: business_type,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        phone_number: sanitizedPhone,
        address: address,
        city: 'Unknown',
        state: 'Unknown',
        zip_code: '00000',
        website: '',
        description: `Professional ${business_type} services`,
        services: ['General Services'],
        service_areas: ['Local Area'],
        business_hours: {
          monday: { open: '08:00', close: '17:00' },
          tuesday: { open: '08:00', close: '17:00' },
          wednesday: { open: '08:00', close: '17:00' },
          thursday: { open: '08:00', close: '17:00' },
          friday: { open: '08:00', close: '17:00' },
          saturday: { open: '09:00', close: '15:00' },
          sunday: { open: '09:00', close: '15:00' }
        },
        greeting_message: `Thank you for calling ${sanitizedBusinessName}. How can I help you today?`,
        tone: 'professional',
        onboarding_completed: false,
        account_status: 'new_account',
        subscription_status: 'inactive'
      })
      .select()
      .single()

    if (businessError) {
      // Cleanup auth user if business creation fails
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      throw new Error(`Business creation failed: ${businessError.message}`)
    }

    // Update user metadata with business_id
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        business_id: business.id
      }
    })
    
    if (updateError) {
      throw new Error(`Failed to update user with business_id: ${updateError.message}`)
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        businessId: business.id,
        role: 'owner',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        iss: 'cloudgreet',
        aud: 'cloudgreet-api'
      },
      jwtSecret,
      { 
        algorithm: 'HS256',
        keyid: 'v1'
      }
    )

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || business_name.split(' ')[0] || '',
        last_name: user.user_metadata?.last_name || business_name.split(' ').slice(1).join(' ') || '',
        business_id: business.id,
        role: 'owner'
      },
      business: {
        id: business.id,
        business_name: business.business_name,
        business_type: business.business_type,
        onboarding_completed: business.onboarding_completed,
        phone_number: business.phone_number
      }
    })

  } catch (error) {
    logger.error('Registration error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed'
    }, { status: 500 })
  }
}
