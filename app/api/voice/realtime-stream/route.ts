import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Store session data for SSE connections
const sessionData = new Map<string, any>()

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
        sessionData.set(sessionId, { controller, encoder })
        
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
        sessionData.delete(sessionId)
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

// Helper function to send messages to SSE clients
export function sendToSession(sessionId: string, message: any) {
  const session = sessionData.get(sessionId)
  if (session) {
    try {
      session.controller.enqueue(session.encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
    } catch (error) {
      console.error('❌ Error sending to session:', error)
    }
  }
}