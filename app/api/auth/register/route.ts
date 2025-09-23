import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const registerSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  business_type: z.string().min(1, 'Business type is required'),
  owner_name: z.string().min(1, 'Owner name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().optional(),
  website: z.string().optional(),
  services: z.array(z.string()).default(['General Service']),
  service_areas: z.array(z.string()).default(['Local Area'])
})

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      error_message: 'Registration API is ready',
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
    const validatedData = registerSchema.parse(body)
    
    // Validate request size
    const contentLength = request.headers.get('content-length')
    const maxRequestSize = parseInt(process.env.MAX_REQUEST_SIZE || '10240') // Default 10KB
    if (contentLength && parseInt(contentLength) > maxRequestSize) {
      return NextResponse.json(
        { error: { code: 'REQUEST_TOO_LARGE', error_message: 'Request size exceeds limit' } },
        { status: 413 }
      )
    }
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin()
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()
    
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User with this email already exists'
      }, { status: 409 })
    }
    
    // Create user record first (no foreign key dependencies)
    const { data: user, error: userError } = await supabaseAdmin()
      .from('users')
      .insert({
        email: validatedData.email,
        name: validatedData.owner_name,
        first_name: validatedData.owner_name.split(' ')[0] || validatedData.owner_name,
        last_name: validatedData.owner_name.split(' ').slice(1).join(' ') || '',
        password_hash: validatedData.password, // Would hash with bcrypt in production
        phone: validatedData.phone,
        role: 'owner',
        is_admin: true,
        is_active: true,
        status: 'active',
        created_at: new Date().toISOString()
      } as any)
      .select()
      .single()
    
    if (userError || !user) {
      // Log the specific error
      console.error('User creation error:', userError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create user account',
        details: userError?.message || 'Unknown error'
      }, { status: 500 })
    }
    
    // Create business record with owner_id
    const { data: business, error: businessError } = await supabaseAdmin()
      .from('businesses')
      .insert({
        owner_id: (user as any).id,
        business_name: validatedData.business_name,
        business_type: validatedData.business_type,
        owner_name: validatedData.owner_name,
        email: validatedData.email,
        phone: validatedData.phone,
        phone_number: validatedData.phone,
        address: validatedData.address || 'Not provided',
        city: 'Not provided',
        state: 'Not provided', 
        zip_code: '00000',
        website: validatedData.website || null,
        services: validatedData.services,
        service_areas: validatedData.service_areas,
        subscription_status: 'inactive',
        onboarding_completed: false,
        created_at: new Date().toISOString()
      } as any)
      .select()
      .single()
    
    if (businessError || !business) {
      // Clean up user record if business creation fails
      await supabaseAdmin()
        .from('users')
        .delete()
        .eq('id', (user as any).id)
      
      // Log the specific error
      console.error('Business creation error:', businessError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create business record',
        details: businessError?.message || 'Unknown error'
      }, { status: 500 })
    }
    
    // Update user with business_id
    await (supabaseAdmin() as any)
      .from('users')
      .update({ business_id: (business as any).id })
      .eq('id', (user as any).id)
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    const token = jwt.sign(
      {
        userId: (user as any).id,
        email: (user as any).email,
        businessId: (business as any).id,
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
    
    return NextResponse.json({
      success: true,
      error_message: 'Account created successfully',
      data: {
        token,
        user: {
          id: (user as any).id,
          email: (user as any).email,
          name: (user as any).name,
          role: (user as any).role
        },
        business: {
          id: (business as any).id,
          business_name: (business as any).business_name,
          business_type: (business as any).business_type,
          onboarding_completed: (business as any).onboarding_completed
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Registration API error',
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
      error: 'Registration failed. Please try again.'
    }, { status: 500 })
  }
}
