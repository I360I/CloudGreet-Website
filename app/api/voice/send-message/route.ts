import { NextRequest, NextResponse } from 'next/server'
import WebSocket from 'ws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Store active WebSocket connections to OpenAI
const openaiConnections = new Map<string, WebSocket>()

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json()
    
    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Session ID and message required' }, { status: 400 })
    }

    console.log('💬 Sending message for session:', sessionId)

    // Get the OpenAI WebSocket connection for this session
    const openaiWs = openaiConnections.get(sessionId)
    
    if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) {
      return NextResponse.json({ 
        success: false,
        error: 'OpenAI connection not found or closed' 
      }, { status: 404 })
    }

    // Send message to OpenAI
    openaiWs.send(JSON.stringify(message))
    
    console.log('✅ Message sent to OpenAI:', message.type)

    return NextResponse.json({ 
      success: true,
      message: 'Message sent to OpenAI'
    })

  } catch (error: any) {
    console.error('❌ Error sending message:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}
