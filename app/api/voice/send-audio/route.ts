import { NextRequest, NextResponse } from 'next/server'
import WebSocket from 'ws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Store active WebSocket connections to OpenAI
const openaiConnections = new Map<string, WebSocket>()

export async function POST(request: NextRequest) {
  try {
    const { sessionId, audioData } = await request.json()
    
    if (!sessionId || !audioData) {
      return NextResponse.json({ error: 'Session ID and audio data required' }, { status: 400 })
    }

    console.log('🎤 Sending audio data for session:', sessionId)

    // Get the OpenAI WebSocket connection for this session
    const openaiWs = openaiConnections.get(sessionId)
    
    if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) {
      return NextResponse.json({ 
        success: false,
        error: 'OpenAI connection not found or closed' 
      }, { status: 404 })
    }

    // Convert base64 audio data back to binary
    const binaryData = atob(audioData)
    const audioBuffer = new ArrayBuffer(binaryData.length)
    const view = new Uint8Array(audioBuffer)
    for (let i = 0; i < binaryData.length; i++) {
      view[i] = binaryData.charCodeAt(i)
    }

    // Send audio data to OpenAI
    openaiWs.send(audioBuffer)
    
    console.log('✅ Audio data sent to OpenAI')

    return NextResponse.json({ 
      success: true,
      message: 'Audio data sent to OpenAI'
    })

  } catch (error: any) {
    console.error('❌ Error sending audio:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}
