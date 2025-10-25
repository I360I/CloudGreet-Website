import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Simple AI response
    return NextResponse.json({
      success: true,
      message: 'Voice AI working',
      ai_response: "Hello! Thank you for calling CloudGreet. How can I help you today?",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Voice AI error'
    }, { status: 500 })
  }
}
