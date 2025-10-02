import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // Admin password verification
    if (password === '1487') {
      return NextResponse.json({ 
        success: true, 
        message: 'Admin access granted',
        adminToken: 'admin_' + Date.now() // Simple token for session
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Invalid admin password' 
    }, { status: 401 })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Authentication failed' 
    }, { status: 500 })
  }
}

