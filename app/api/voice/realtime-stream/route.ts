import { NextRequest, NextResponse } from 'next/server'
import { storeSession, removeSession } from '../../../lib/voice-session-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    console.log('🔌 Creating realtime stream for session:', sessionId)

    // Create Server-Sent Events stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to realtime stream' })}\n\n`))
        
        // Store the controller for this session
        storeSession(sessionId, controller, encoder)
        
        // Send a test response to show it's working
        setTimeout(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'response.text.delta', 
              delta: 'Hello! I\'m your AI receptionist. How can I help you today?' 
            })}\n\n`))
          } catch (error) {
            console.error('❌ Error sending test message:', error)
          }
        }, 1000)
      },
      
      cancel() {
        console.log('🔌 SSE stream cancelled for session:', sessionId)
        removeSession(sessionId)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error: any) {
    console.error('❌ Error creating realtime stream:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}