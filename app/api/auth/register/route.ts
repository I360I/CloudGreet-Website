import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { registrationSchema } from '@/lib/validation'
import { validatePhoneWithError, phoneNumberExists } from '@/lib/phone-validation'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Force Node.js runtime to avoid Edge Runtime JWT issues
export const runtime = 'nodejs'

// Apply rate limiting to the register endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Database not configured. Please contact support.'
      }, { status: 503 })
    }

    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    
    // Validate request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10240) { // 10KB limit for registration
      return NextResponse.json(
        { error: { code: 'REQUEST_TOO_LARGE', message: 'Request size exceeds limit' } },
        { status: 413 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = registrationSchema.parse(body)
    
    const { 
      businessName,
      businessType,
      email, 
      password, 
      phone, 
      website,
      address
    } = validatedData
    
    // Sanitize inputs
    const sanitizedEmail = email.toLowerCase().trim()
    const sanitizedPassword = password.trim()
    const sanitizedBusinessName = businessName.trim()
    
    // Validate and format phone number
    const phoneValidation = validatePhoneWithError(phone)
    if (!phoneValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: phoneValidation.error || 'Invalid phone number'
      }, { status: 400 })
    }
    
    const sanitizedPhone = phone.replace(/\D/g, '') // Remove non-digits
    
    // Check if phone number already exists
    const phoneExists = await phoneNumberExists(phone, supabaseAdmin)
    if (phoneExists) {
      return NextResponse.json({
        success: false,
        message: 'A business with this phone number already exists'
      }, { status: 409 })
    }
    
    // Check if JWT secret is properly configured
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret === 'fallback-secret') {
      throw new Error('JWT_SECRET not properly configured')
    }

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
        return NextResponse.json(
          { error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } },
          { status: 409 }
        )
      }
      throw new Error(`User creation failed: ${authError.message}`)
    }

    const user = authUser.user

    // Create business record with owner_id
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: user.id,
        business_name: sanitizedBusinessName,
        business_type: businessType,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        phone_number: sanitizedPhone,
        address: address,
        city: 'Unknown',
        state: 'Unknown',
        zip_code: '00000',
        website: website || '',
        description: `Professional ${businessType} services`,
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

    // NOTE: AI agent will be created AFTER onboarding is completed
    // This allows us to collect all necessary information first

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

    // Registration successful - no audit logging needed

    // Send notification about new client signup
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'client_acquisition',
          message: `${business.business_name} (${user.email}) signed up for CloudGreet`,
          businessId: business.id,
          priority: 'high'
        })
      })
    } catch (error) {
      // Notification failed - continue with registration
    }

    // Calculate response time
    const responseTime = Date.now() - startTime

    // Create response with security headers
    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || businessName.split(' ')[0] || '',
          last_name: user.user_metadata?.last_name || businessName.split(' ').slice(1).join(' ') || '',
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
      },
      meta: {
        requestId,
        responseTime,
        timestamp: new Date().toISOString()
      }
    })

    // Apply security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return response

  } catch (error) {
    // Error occurred during registration

    // Return proper error response
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      )
    }

    // Always return the actual error message for debugging
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    )
  }
}

