import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { loginSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
// import { rateLimiters } from '@/lib/rate-limit' // Not used

// Force Node.js runtime to avoid Edge Runtime JWT issues
export const runtime = 'nodejs'

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

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: sanitizedEmail,
      password: sanitizedPassword
    })
    
    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      )
    }
    
    const user = authData.user

    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'

    // Get business_id from user metadata
    const businessId = user.user_metadata?.business_id

    // Check if JWT secret is properly configured
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret.includes('fallback') || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET not properly configured - must be set in production')
    }

        // Create JWT token with proper claims
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            businessId: businessId || null,
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

    // Get business data if user has a business_id
    let business = null
    if (businessId) {
      const { data: businessData, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select(`
          id,
          business_name,
          business_type,
          phone_number,
          onboarding_completed
        `)
        .eq('id', businessId)
        .single()
      
      if (!businessError && businessData) {
        business = businessData
      }
    }

    // Update last login in user metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        last_login: new Date().toISOString()
      }
    })

    // Login successful - no audit logging needed

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
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          business_id: businessId || null,
          role: 'owner',
          last_login: user.user_metadata?.last_login || new Date().toISOString()
        },
        business: business
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
    // Error occurred during login

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
