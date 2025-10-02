import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract required fields
    const { 
      business_name, 
      business_type, 
      email, 
      password, 
      phone, 
      address 
    } = body

    // Basic validation
    if (!business_name || !email || !password || !phone || !address) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User already exists with this email' 
      }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        name: business_name.trim(),
        first_name: business_name.split(' ')[0] || business_name,
        last_name: business_name.split(' ').slice(1).join(' ') || '',
        phone: phone.replace(/\D/g, ''),
        is_active: true,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create user' 
      }, { status: 500 })
    }

    // Create business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        business_name: business_name.trim(),
        business_type: business_type || 'General',
        email: email.toLowerCase().trim(),
        phone: phone.replace(/\D/g, ''),
        address: address.trim(),
        owner_id: user.id,
        is_active: true,
        onboarding_completed: true,
        greeting_message: `Hello! Thank you for calling ${business_name.trim()}. How can I help you today?`,
        ai_tone: 'professional',
        services: business_type === 'HVAC' ? ['HVAC Repair', 'HVAC Installation', 'HVAC Maintenance'] :
                 business_type === 'Paint' ? ['Interior Painting', 'Exterior Painting', 'Commercial Painting'] :
                 business_type === 'Roofing' ? ['Roofing Installation', 'Roof Repair', 'Roof Maintenance'] :
                 ['General Services'],
        service_areas: ['Local Area'],
        business_hours: {
          monday: '9 AM - 5 PM',
          tuesday: '9 AM - 5 PM',
          wednesday: '9 AM - 5 PM',
          thursday: '9 AM - 5 PM',
          friday: '9 AM - 5 PM',
          saturday: 'closed',
          sunday: 'closed'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (businessError) {
      console.error('Business creation error:', businessError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create business' 
      }, { status: 500 })
    }

    // Update user with business_id
    await supabaseAdmin
      .from('users')
      .update({ business_id: business.id })
      .eq('id', user.id)

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    const token = jwt.sign(
      { 
        userId: user.id, 
        businessId: business.id,
        email: user.email,
        role: 'owner'
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        business_id: business.id
      },
      business: {
        id: business.id,
        business_name: business.business_name,
        business_type: business.business_type
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Registration failed. Please try again.' 
    }, { status: 500 })
  }
}
