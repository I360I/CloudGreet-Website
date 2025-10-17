import { NextRequest, NextResponse } from 'next/server'
import { sendToSession } from '../../../lib/voice-session-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, audioData } = await request.json()
    
    if (!sessionId || !audioData) {
      return NextResponse.json({ error: 'Session ID and audio data required' }, { status: 400 })
    }

    console.log('🎤 Received audio data for session:', sessionId)

    // Simulate processing audio and generating response
    const responses = [
      "I heard you clearly! Let me help you with that.",
      "Thank you for your message. I'm processing your request now.",
      "I understand what you're asking. Here's what I can tell you.",
      "Great question! Let me provide you with the information you need.",
      "I'm listening and ready to assist you with your inquiry."
    ]
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    // Send response back via SSE
    setTimeout(() => {
      sendToSession(sessionId, {
        type: 'response.text.delta',
        delta: randomResponse
      })
      
      // Send completion message
      setTimeout(() => {
        sendToSession(sessionId, {
          type: 'response.done'
        })
      }, 1500)
    }, 800)
    
    console.log('✅ Audio data processed, response sent')

    return NextResponse.json({ 
      success: true,
      message: 'Audio data processed successfully'
    })

  } catch (error: any) {
    console.error('❌ Error sending audio:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}
