import { NextRequest, NextResponse } from 'next/server'
import { WebSocket } from 'ws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const clientSecret = searchParams.get('client_secret')
    
    if (!sessionId || !clientSecret) {
      return NextResponse.json({ error: 'Session ID and client secret required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Create authenticated WebSocket connection to OpenAI
    const wsUrl = `wss://api.openai.com/v1/realtime?session_id=${sessionId}&client_secret=${clientSecret}`
    
    // Create WebSocket with proper headers
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    })

    return NextResponse.json({ 
      wsUrl,
      message: 'Authenticated WebSocket URL created',
      authenticated: true
    })
  } catch (error: any) {
    console.error('Error creating authenticated WebSocket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
