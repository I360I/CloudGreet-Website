import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'User ID or email is required' },
        { status: 400 }
      )
    }

    // Simulate user data
    const userData = {
      id: userId || 'demo-user-id',
      email: email || 'demo@example.com',
      name: 'Demo User',
      business_name: 'Demo Business',
      phone: '+1 (555) 123-4567',
      created_at: new Date().toISOString(),
      status: 'active'
    }

    return NextResponse.json({
      success: true,
      user: userData
    })

  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

