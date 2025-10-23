import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Database not configured. Please contact support.'
      }, { status: 503 })
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 })
    }

    const sanitizedEmail = email.toLowerCase().trim()

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: sanitizedEmail,
      password: password
    })

    if (authError || !authData.user) {
      logger.warn('Login failed', {
        email: sanitizedEmail,
        error: authError?.message,
        requestId
      })
      
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      }, { status: 401 })
    }

    const user = authData.user

    // Get business data
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for user', {
        userId: user.id,
        error: businessError?.message,
        requestId
      })
      
      return NextResponse.json({
        success: false,
        message: 'Business account not found'
      }, { status: 404 })
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret === 'fallback-secret') {
      throw new Error('JWT_SECRET not properly configured')
    }

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

    const responseTime = Date.now() - startTime

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
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

    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')

    return response

  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    })

    return NextResponse.json({
      success: false,
      message: 'Login failed. Please try again.'
    }, { status: 500 })
  }
}
