import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const registerSchema = z.object({
  business_name: z.string().min(2, 'Business name required'),
  business_type: z.enum(['HVAC', 'Paint', 'Roofing', 'Plumbing', 'Electrical', 'Cleaning', 'Landscaping', 'General']),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Valid phone number required'),
  address: z.string().min(5, 'Address required')
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.'
      }, { status: 503 })
    }

    // Parse and validate request
    const body = await request.json()
    const validatedData = registerSchema.parse(body)
    
    const { business_name, business_type, email, password, phone, address } = validatedData
    
    // Sanitize inputs
    const sanitizedEmail = email.toLowerCase().trim()
    const sanitizedBusinessName = business_name.trim()
    const sanitizedPhone = phone.replace(/\D/g, '')
    
    // Check JWT secret
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret.length < 32) {
      logger.error('JWT_SECRET not properly configured')
      return NextResponse.json({
        success: false,
        message: 'Server configuration error'
      }, { status: 500 })
    }

    // Check for existing email
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUser?.users?.some((u: any) => u.email === sanitizedEmail)
    
    if (emailExists) {
      return NextResponse.json({
        success: false,
        message: 'An account with this email already exists'
      }, { status: 409 })
    }

    // Check for existing phone number
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('phone', sanitizedPhone)
      .single()
    
    if (existingBusiness) {
      return NextResponse.json({
        success: false,
        message: 'A business with this phone number already exists'
      }, { status: 409 })
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password: password,
      user_metadata: {
        first_name: sanitizedBusinessName.split(' ')[0] || sanitizedBusinessName,
        last_name: sanitizedBusinessName.split(' ').slice(1).join(' ') || '',
        phone: sanitizedPhone,
        is_admin: false,
        created_via: 'register_simple'
      },
      email_confirm: true
    })

    if (authError) {
      logger.error('User creation failed', { 
        error: authError,
        requestId,
        email: sanitizedEmail
      })
      return NextResponse.json({
        success: false,
        message: authError.message || 'Account creation failed'
      }, { status: 500 })
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
        city: 'To be determined',
        state: 'To be determined',
        zip_code: '00000',
        description: `Professional ${business_type} services`,
        services: [`${business_type} Services`],
        service_areas: ['Local Area'],
        business_hours: {
          monday: { open: '08:00', close: '17:00', closed: false },
          tuesday: { open: '08:00', close: '17:00', closed: false },
          wednesday: { open: '08:00', close: '17:00', closed: false },
          thursday: { open: '08:00', close: '17:00', closed: false },
          friday: { open: '08:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '15:00', closed: true },
          sunday: { open: '09:00', close: '15:00', closed: true }
        },
        greeting_message: `Thank you for calling ${sanitizedBusinessName}. How can I help you today?`,
        tone: 'professional',
        voice: 'alloy',
        onboarding_completed: false,
        account_status: 'new_account',
        subscription_status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (businessError) {
      // Cleanup: Delete auth user if business creation fails
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      logger.error('Business creation failed', {
        error: businessError,
        requestId,
        userId: user.id
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to create business account'
      }, { status: 500 })
    }

    // Update user metadata with business_id
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        business_id: business.id
      }
    })

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        businessId: business.id,
        role: 'owner',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
        iss: 'cloudgreet',
        aud: 'cloudgreet-api'
      },
      jwtSecret,
      { algorithm: 'HS256', keyid: 'v1' }
    )

    logger.info('Registration successful', {
      requestId,
      userId: user.id,
      businessId: business.id,
      businessType: business_type,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        business_id: business.id,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: 'owner'
      },
      business: {
        id: business.id,
        business_name: business.business_name,
        business_type: business.business_type,
        onboarding_completed: false,
        phone_number: business.phone_number
      },
      message: 'Account created successfully'
    })

  } catch (error) {
    logger.error('Registration error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: error.issues[0]?.message || 'Validation failed'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Registration failed. Please try again.'
    }, { status: 500 })
  }
}

