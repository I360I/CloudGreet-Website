import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { loginSchema } from '@/lib/validation'
// import { rateLimiters } from '@/lib/rate-limit' // Not used

// Apply rate limiting to the login endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    
    // Validate request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 1024) {
      return NextResponse.json(
        { error: { code: 'REQUEST_TOO_LARGE', message: 'Request size exceeds limit' } },
        { status: 413 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)
    
    // Sanitize inputs
    const sanitizedEmail = email.toLowerCase().trim()
    const sanitizedPassword = password.trim()

    // Get user from database with proper error handling
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        password_hash,
        business_id,
        role,
        last_login,
        created_at,
        business:businesses(
          id,
          business_name,
          business_type,
          phone_number,
          onboarding_completed
        )
      `)
      .eq('email', sanitizedEmail)
      .eq('status', 'active')
      .single()

    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'

    if (userError || !user) {
      // Log failed login attempt for security monitoring
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'login_failed',
          details: { email: sanitizedEmail, reason: 'user_not_found' },
          ip_address: clientIP,
          user_agent: request.headers.get('user-agent'),
          created_at: new Date().toISOString()
        })
      
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      )
    }

    // Verify password with proper timing attack protection
    const isValidPassword = await bcrypt.compare(sanitizedPassword, user.password_hash)
    if (!isValidPassword) {
      // Log failed login attempt
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'login_failed',
          details: { email: sanitizedEmail, reason: 'invalid_password', user_id: user.id },
          ip_address: clientIP,
          user_agent: request.headers.get('user-agent'),
          created_at: new Date().toISOString()
        })
      
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      )
    }

    // Check if JWT secret is properly configured
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret === 'fallback-secret') {
      throw new Error('JWT_SECRET not properly configured')
    }

        // Create JWT token with proper claims
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            businessId: user.business_id,
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

    // Update last login and login count
    await supabaseAdmin
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        login_count: ((user as any).login_count || 0) + 1
      })
      .eq('id', user.id)

    // Log successful login
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'login_success',
        details: { user_id: user.id, email: user.email },
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent'),
        created_at: new Date().toISOString()
      })

    // Calculate response time for monitoring
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
          business_id: user.business_id,
          role: user.role,
          last_login: user.last_login
        },
        business: user.business
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
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'login_error',
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
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
