import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // Admin password verification
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'demo_admin_2024'
    if (password === adminPassword) {
      return NextResponse.json({ 
        success: true, 
        error_message: 'Admin access granted',
        adminToken: 'admin_' + Date.now() // Simple token for session
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error_message: 'Invalid admin password' 
    }, { status: 401 })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error_message: 'Authentication failed' 
    }, { status: 500 })
  }
}

