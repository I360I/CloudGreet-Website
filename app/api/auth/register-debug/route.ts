import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    console.log('=== REGISTRATION DEBUG START ===')
    
    const body = await request.json()
    console.log('Request body received:', body)
    
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
    
    // Step 1: Comprehensive validation
    console.log('Step 1: Comprehensive validation')
    
    // Check required fields
    if (!business_name?.trim()) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }
    
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    if (!password?.trim()) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }
    
    if (!phone?.trim()) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }
    
    if (!address?.trim()) {
      return NextResponse.json(
        { error: 'Business address is required' },
        { status: 400 }
      )
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }
    
    // Validate phone format
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }
    
    console.log('Step 1: Validation passed')
    
    // Step 2: Check if user already exists
    console.log('Step 2: Checking existing user')
    const { data: existingUser, error: existingError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.log('Step 2: Error checking existing user:', existingError)
      return NextResponse.json(
        { error: `Database error: ${existingError.message}` },
        { status: 500 }
      )
    }

    if (existingUser) {
      console.log('Step 2: User already exists')
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }
    console.log('Step 2: User does not exist, proceeding')

    // Step 3: Hash password
    console.log('Step 3: Hashing password')
    const passwordHash = await bcrypt.hash(password, 12)
    console.log('Step 3: Password hashed successfully')

    // Step 4: Create both user and business in a transaction-like approach
    console.log('Step 4: Creating user and business records')
    
    // First, create user record
    const userData = {
      email: email.toLowerCase().trim(),
      name: owner_name || business_name.trim(),
      password_hash: passwordHash,
      role: 'owner',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('User data to insert:', { ...userData, password_hash: '[HIDDEN]' })
    
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (userError) {
      console.log('Step 4: User creation error:', userError)
      return NextResponse.json(
        { error: `User creation failed: ${userError.message}` },
        { status: 500 }
      )
    }
    console.log('Step 4: User created successfully:', user.id)

    // Then, create business record with user_id
    const businessData = {
      user_id: user.id,
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
    }
    
    console.log('Business data to insert:', businessData)
    
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert(businessData)
      .select()
      .single()

    if (businessError) {
      console.log('Step 5: Business creation error:', businessError)
      // Cleanup user record if business creation fails
      console.log('Cleaning up user record due to business creation failure')
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id)
      
      return NextResponse.json(
        { error: `Business creation failed: ${businessError.message}` },
        { status: 500 }
      )
    }
    console.log('Step 5: Business created successfully:', business.id)

    // Step 6: Update user with business_id
    console.log('Step 6: Updating user with business_id')
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ business_id: business.id })
      .eq('id', user.id)

    if (updateError) {
      console.log('Step 6: User update error:', updateError)
      // Cleanup both records if update fails
      console.log('Cleaning up both records due to update failure')
      await supabaseAdmin
        .from('businesses')
        .delete()
        .eq('id', business.id)
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id)
      
      return NextResponse.json(
        { error: `User update failed: ${updateError.message}` },
        { status: 500 }
      )
    }
    console.log('Step 6: User updated successfully')

    // Step 7: Create JWT token
    console.log('Step 7: Creating JWT token')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.log('Step 7: JWT secret not configured')
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
    console.log('Step 7: JWT token created successfully')

    console.log('=== REGISTRATION DEBUG SUCCESS ===')

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
    console.log('=== REGISTRATION DEBUG ERROR ===')
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
