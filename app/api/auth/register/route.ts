import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Test Supabase connection first
    console.log('🔍 Testing Supabase connection...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { name, email, password, business_name, business_type, phone } = await request.json()

    // Validation
    if (!name || !email || !password || !business_name || !business_type || !phone) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Field length validation
    if (name.length > 500) {
      return NextResponse.json(
        { error: 'Name is too long (max 500 characters)' },
        { status: 400 }
      )
    }

    if (business_name.length > 500) {
      return NextResponse.json(
        { error: 'Business name is too long (max 500 characters)' },
        { status: 400 }
      )
    }

    if (phone.length > 50) {
      return NextResponse.json(
        { error: 'Phone number is too long (max 50 characters)' },
        { status: 400 }
      )
    }

    if (email.length > 255) {
      return NextResponse.json(
        { error: 'Email is too long (max 255 characters)' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user in database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          hashed_password: hashedPassword,
          business_name,
          business_type,
          phone
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Database error:', insertError)
      
      // Provide more specific error messages
      if (insertError.message.includes('value too long')) {
        return NextResponse.json(
          { error: 'One or more fields are too long. Please check your input and try again.' },
          { status: 400 }
        )
      }
      
      if (insertError.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `Failed to create account: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Return success (don't return password hash)
    const { hashed_password, ...userWithoutPassword } = newUser

    return NextResponse.json({
      message: 'Account created successfully',
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}