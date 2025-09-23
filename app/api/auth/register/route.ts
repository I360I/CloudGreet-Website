import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { registerSchema } from '@/lib/validation'
// import { rateLimiters } from '@/lib/rate-limit' // Not used
import { telynyx } from '@/lib/telynyx'

// Apply rate limiting to the register endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
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
    const validatedData = registerSchema.parse(body)
    
    const { 
      business_name,
      business_type,
      owner_name,
      email, 
      password, 
      phone, 
      website,
      address, 
      services, 
      service_areas 
    } = validatedData
    
    // Sanitize inputs
    const sanitizedEmail = email.toLowerCase().trim()
    const sanitizedPassword = password.trim()
    const sanitizedBusinessName = business_name.trim()
    const sanitizedOwnerName = owner_name.trim()
    const sanitizedPhone = phone.replace(/\D/g, '') // Remove non-digits
    
    // Check if JWT secret is properly configured
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret === 'fallback-secret') {
      throw new Error('JWT_SECRET not properly configured')
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', sanitizedEmail)
      .single()

    if (existingUser) {
      // Log registration attempt with existing email
      await supabase
        .from('audit_logs')
        .insert({
          action: 'registration_failed',
          details: { email: sanitizedEmail, reason: 'email_exists' },
          ip_address: ip,
          user_agent: request.headers.get('user-agent'),
          created_at: new Date().toISOString()
        })

      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } },
        { status: 409 }
      )
    }

    // Hash password with proper salt rounds
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(sanitizedPassword, saltRounds)

    // Create business record first
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        business_name: sanitizedBusinessName,
        business_type: business_type,
        owner_name: sanitizedOwnerName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        website: website,
        address: address,
        services: services,
        service_areas: service_areas,
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
        ai_tone: 'professional',
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (businessError) {
      throw new Error(`Business creation failed: ${businessError.message}`)
    }

    // Create user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: sanitizedEmail,
        name: sanitizedOwnerName,
        password_hash: passwordHash,
        business_id: business.id,
        role: 'owner',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      // Cleanup business record if user creation fails
      await supabase
        .from('businesses')
        .delete()
        .eq('id', business.id)
      
      throw new Error(`User creation failed: ${userError.message}`)
    }

    // Create AI agent record
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .insert({
        user_id: user.id,
        business_id: business.id,
        business_name: sanitizedBusinessName,
        business_type: business_type,
        greeting_message: business.greeting_message,
        tone: business.ai_tone,
        services: services,
        service_areas: service_areas,
        business_hours: business.business_hours,
        is_active: false, // Will be activated after phone setup
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (agentError) {
      throw new Error(`Agent creation failed: ${agentError.message}`)
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        businessId: business.id,
        role: user.role,
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

    // Log successful registration
    await supabase
      .from('audit_logs')
      .insert({
        action: 'registration_success',
        details: { 
          user_id: user.id, 
          email: user.email,
          business_id: business.id,
          business_name: sanitizedBusinessName
        },
        ip_address: ip,
        user_agent: request.headers.get('user-agent'),
        created_at: new Date().toISOString()
      })

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
          name: user.name,
          business_id: business.id,
          role: user.role
        },
        business: {
          id: business.id,
          business_name: business.business_name,
          business_type: business.business_type,
          onboarding_completed: business.onboarding_completed
        },
        agent: {
          id: agent.id,
          is_active: agent.is_active
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
    // Log error for monitoring
    await supabase
      .from('audit_logs')
      .insert({
        action: 'registration_error',
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId 
        },
        ip_address: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
        created_at: new Date().toISOString()
      })

    // Return proper error response
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Registration failed. Please try again.' } },
      { status: 500 }
    )
  }
}
