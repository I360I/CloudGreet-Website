import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Login API is ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = loginSchema.parse(body)
    
    // Normalize email to lowercase and trim
    validatedData.email = validatedData.email.toLowerCase().trim()
    
    // Get user from database (simplified query)
    const { data: user, error: userError } = await supabaseAdmin()
      .from('users')
      .select('id, email, name, password_hash, business_id, role, status')
      .eq('email', validatedData.email)
      .eq('status', 'active')
      .single()
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }
    
    // Verify password - comparing with stored password_hash
    // The password_hash field actually contains the plain text password
    const passwordMatch = validatedData.password === (user as any).password_hash
    
    if (!passwordMatch) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    const token = jwt.sign(
      {
        userId: (user as any).id,
        email: (user as any).email,
        businessId: (user as any).business_id,
        role: (user as any).role,
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
    
    // Update last login (simplified for build - would update in production)
    // Log successful login for monitoring
    try {
      await supabaseAdmin().from('audit_logs').insert({
        action: 'user_login',
        user_id: (user as any).id,
        business_id: (user as any).business_id,
        details: { email: (user as any).email },
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Log error but don't fail the login
    }
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: (user as any).id,
          email: (user as any).email,
          name: (user as any).name,
          role: (user as any).role,
          business_id: (user as any).business_id
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Login API error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Login failed. Please try again.'
    }, { status: 500 })
  }
}
