import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email and password are required' 
      }, { status: 400 })
    }

    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid email or password' 
      }, { status: 401 })
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid email or password' 
      }, { status: 401 })
    }

    // Get business info
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    const token = jwt.sign(
      { 
        userId: user.id, 
        businessId: business?.id || null,
        email: user.email,
        role: 'owner'
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        business_id: business?.id || null
      },
      business: business ? {
        id: business.id,
        business_name: business.business_name,
        business_type: business.business_type
      } : null
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    }, { status: 500 })
  }
}
