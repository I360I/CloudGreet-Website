import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // For direct WebSocket connection, we don't need to create a session
    // The client will connect directly with the API key
    console.log('✅ OpenAI Realtime API ready for direct WebSocket connection')
    
    return NextResponse.json({
      ready: true,
      message: 'Ready for direct WebSocket connection',
      mock: false
    })

  } catch (error: any) {
    console.error('❌ Session check error:', error)
    
    return NextResponse.json({
      error: error.message,
      mock: true
    }, { status: 500 })
  }
}

