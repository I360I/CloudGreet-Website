import { NextRequest, NextResponse } from 'next/server'
import { findUserById, findUserByEmail } from '../../../lib/auth'

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

    let user
    if (userId) {
      user = await findUserById(userId)
    } else if (email) {
      user = await findUserByEmail(email)
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return user data without sensitive information
    const { hashed_password, ...userData } = user

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

