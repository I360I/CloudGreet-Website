import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Registration request:', body)
    
    const { 
      business_name,
      business_type,
      owner_name,
      email, 
      password, 
      phone, 
      address,
      services,
      service_areas
    } = body
    
    // Basic validation
    if (!business_name || !email || !password || !phone || !address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create business record first
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        business_name: business_name.trim(),
        business_type: business_type || 'HVAC',
        owner_name: owner_name || business_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.replace(/\D/g, ''),
        website: '',
        address: address.trim(),
        services: services || ['General Service'],
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
        greeting_message: `Thank you for calling ${business_name.trim()}. How can I help you today?`,
        ai_tone: 'professional',
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (businessError) {
      console.error('Business creation error:', businessError)
      return NextResponse.json(
        { error: `Business creation failed: ${businessError.message}` },
        { status: 500 }
      )
    }

    // Create user record
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        name: owner_name || business_name.trim(),
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
      console.error('User creation error:', userError)
      // Cleanup business record if user creation fails
      await supabaseAdmin
        .from('businesses')
        .delete()
        .eq('id', business.id)
      
      return NextResponse.json(
        { error: `User creation failed: ${userError.message}` },
        { status: 500 }
      )
    }

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'JWT secret not configured' },
        { status: 500 }
      )
    }

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

    console.log('Registration successful for:', email)

    return NextResponse.json({
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
        }
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
