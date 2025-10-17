import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, clientSecret } = await request.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('🔐 Creating authenticated WebSocket URL...')
    
    // Create WebSocket URL with proper authentication
    // The key insight is that we need to include the API key in the WebSocket URL
    // since browser WebSockets can't send custom headers
    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionId}&client_secret=${clientSecret}&api_key=${apiKey}`
    
    console.log('✅ Authenticated WebSocket URL created')
    
    return NextResponse.json({
      success: true,
      wsUrl,
      message: 'Authenticated WebSocket URL ready'
    })
    
  } catch (error: any) {
    console.error('Error creating authenticated WebSocket URL:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
