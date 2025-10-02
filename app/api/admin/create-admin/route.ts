import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password || !name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email, password, and name are required' 
      }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User with this email already exists' 
      }, { status: 400 })
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create the admin user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email,
        password_hash: passwordHash,
        name: name,
        first_name: name.split(' ')[0] || 'Admin',
        last_name: name.split(' ').slice(1).join(' ') || 'User',
        role: 'admin',
        is_admin: true,
        is_active: true,
        status: 'active'
      })
      .select()
      .single()

    if (userError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create admin user',
        details: userError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
