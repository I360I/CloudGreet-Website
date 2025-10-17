import { NextRequest, NextResponse } from 'next/server'
import { sendToSession } from '../realtime-stream/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json()
    
    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Session ID and message required' }, { status: 400 })
    }

    console.log('💬 Sending message for session:', sessionId)

    // Simulate AI response
    const responses = [
      "I understand you're interested in our services. Let me help you with that.",
      "That's a great question! Our AI receptionist can handle calls 24/7.",
      "I'd be happy to provide more information about our pricing and features.",
      "Would you like to schedule a demo or learn more about our services?",
      "Our system can answer calls, take messages, and even schedule appointments automatically."
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
      }, 1000)
    }, 500)
    
    console.log('✅ Message processed, response sent')

    return NextResponse.json({ 
      success: true,
      message: 'Message processed successfully'
    })

  } catch (error: any) {
    console.error('❌ Error sending message:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}
