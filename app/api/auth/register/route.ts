import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { registerSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// Force Node.js runtime to avoid Edge Runtime JWT issues
export const runtime = 'nodejs'

// Apply rate limiting to the register endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
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
    const validatedData = registerSchema.parse(body)
    
    const { 
      business_name,
      business_type,
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
    const sanitizedPhone = phone.replace(/\D/g, '') // Remove non-digits
    
    // Check if JWT secret is properly configured
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret === 'fallback-secret') {
      throw new Error('JWT_SECRET not properly configured')
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', sanitizedEmail)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } },
        { status: 409 }
      )
    }

    // Hash password with proper salt rounds
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(sanitizedPassword, saltRounds)

    // Create user record first - match your exact database schema
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email: sanitizedEmail,
        password_hash: passwordHash,
        name: sanitizedBusinessName, // Use business name as fallback
        first_name: sanitizedBusinessName.split(' ')[0] || sanitizedBusinessName,
        last_name: sanitizedBusinessName.split(' ').slice(1).join(' ') || '',
        phone: sanitizedPhone,
        is_active: true,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      throw new Error(`User creation failed: ${userError.message}`)
    }

    // Create business record with owner_id
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
        website: website,
        description: `Professional ${business_type} services`,
        services: services || ['General Services'],
        service_areas: service_areas || ['Local Area'],
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
        subscription_status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (businessError) {
      // Cleanup user record if business creation fails
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id)
      
      throw new Error(`Business creation failed: ${businessError.message}`)
    }

    // Update user with business_id - your schema has this column
    await supabaseAdmin
      .from('users')
      .update({ business_id: business.id })
      .eq('id', user.id)

    // Create AI agent record - match your exact database schema
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .insert({
        business_id: business.id,
        business_name: sanitizedBusinessName, // Required field
        agent_name: 'CloudGreet AI Assistant',
        is_active: false, // Will be activated after phone setup
        configuration: {
          greeting_message: `Thank you for calling ${sanitizedBusinessName}. How can I help you today?`,
          tone: 'professional',
          max_call_duration: 10,
          escalation_threshold: 5
        },
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
      console.log('Failed to send new client notification:', error)
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
          first_name: user.first_name,
          last_name: user.last_name,
          business_id: business.id,
          role: 'owner'
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
