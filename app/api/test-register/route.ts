import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, businessName, phone } = body

    console.log('Testing registration with:', { email, businessName, phone })

    // Test Supabase Auth API call
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        first_name: businessName.split(' ')[0] || businessName,
        last_name: businessName.split(' ').slice(1).join(' ') || '',
        phone: phone,
        is_admin: false
      },
      email_confirm: true
    })

    if (authError) {
      console.log('Auth error:', authError)
      return NextResponse.json({
        success: false,
        error: 'Auth creation failed',
        details: authError.message,
        code: authError.status
      }, { status: 400 })
    }

    console.log('Auth user created:', authUser.user?.id)

    return NextResponse.json({
      success: true,
      message: 'Test registration successful',
      userId: authUser.user?.id
    })

  } catch (error) {
    console.log('Test registration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
