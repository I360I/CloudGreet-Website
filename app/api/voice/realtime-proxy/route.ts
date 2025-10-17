import { NextRequest, NextResponse } from 'next/server'
import WebSocket from 'ws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Store active WebSocket connections to OpenAI
const openaiConnections = new Map<string, WebSocket>()

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    console.log('🔌 Creating WebSocket proxy for session:', sessionId)

    // Create WebSocket connection to OpenAI with proper authentication
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Get session details from our API
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/voice/realtime-server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'get_session',
        sessionId
      }),
    })

    if (!sessionResponse.ok) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = await sessionResponse.json()
    
    // Connect to OpenAI Realtime API with proper authentication
    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionId}&client_secret=${encodeURIComponent(sessionData.clientSecret)}`
    
    const openaiWs = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
        'User-Agent': 'CloudGreet/1.0'
      }
    })

    // Store the connection
    openaiConnections.set(sessionId, openaiWs)

    // Handle OpenAI WebSocket events
    openaiWs.on('open', () => {
      console.log('✅ Connected to OpenAI Realtime API for session:', sessionId)
    })

    openaiWs.on('message', (data) => {
      console.log('📨 Received from OpenAI:', data.toString())
      // Forward to client (this would be handled by the WebSocket upgrade)
    })

    openaiWs.on('error', (error) => {
      console.error('❌ OpenAI WebSocket error:', error)
    })

    openaiWs.on('close', (code, reason) => {
      console.log('🔌 OpenAI WebSocket closed:', code, reason.toString())
      openaiConnections.delete(sessionId)
    })

    return NextResponse.json({ 
      success: true, 
      message: 'WebSocket proxy created',
      sessionId 
    })

  } catch (error: any) {
    console.error('❌ Error creating WebSocket proxy:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}