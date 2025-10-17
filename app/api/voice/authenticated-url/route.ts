import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, clientSecret } = await request.json()
    
    if (!sessionId || !clientSecret) {
      return NextResponse.json({ error: 'Session ID and client secret required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Return the authenticated WebSocket URL with API key
    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&api_key=${apiKey}&session_id=${sessionId}&client_secret=${clientSecret}`
    
    return NextResponse.json({ 
      wsUrl,
      message: 'Authenticated WebSocket URL created'
    })
  } catch (error: any) {
    console.error('Error creating authenticated URL:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
