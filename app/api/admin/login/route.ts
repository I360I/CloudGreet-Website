import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    // Check admin password
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Generate admin token
    const jwt = (await import('jsonwebtoken')).default
    const token = jwt.sign(
      { 
        admin: true, 
        timestamp: Date.now() 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    return NextResponse.json({
      success: true,
      token,
      message: 'Admin login successful'
    })

  } catch (error: any) {
    console.error('Admin login error:', error)
    return NextResponse.json({
      error: 'Login failed',
      message: error.message
    }, { status: 500 })
  }
}
