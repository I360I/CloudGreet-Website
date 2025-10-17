import { NextRequest, NextResponse } from 'next/server'
import WebSocket from 'ws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Store active WebSocket connections
const activeConnections = new Map<string, WebSocket>()

export async function POST(request: NextRequest) {
  try {
    const { sessionId, clientSecret, action, data } = await request.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('🔌 WebSocket server handling request:', action)

    if (action === 'create_connection') {
      return await createWebSocketConnection(sessionId, clientSecret, apiKey)
    } else if (action === 'send_message') {
      return await sendMessage(sessionId, data)
    } else if (action === 'close_connection') {
      return await closeConnection(sessionId)
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error in WebSocket server:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function createWebSocketConnection(sessionId: string, clientSecret: string, apiKey: string) {
  try {
    console.log('🔌 Creating server-side WebSocket connection to OpenAI...')
    
    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionId}&client_secret=${clientSecret}`
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
        'User-Agent': 'CloudGreet/1.0'
      }
    })

    return new Promise<NextResponse>((resolve) => {
      const timeout = setTimeout(() => {
        ws.close()
        resolve(NextResponse.json({ 
          success: false,
          error: 'WebSocket connection timeout',
          connected: false
        }, { status: 500 }))
      }, 10000)

      ws.on('open', () => {
        clearTimeout(timeout)
        console.log('✅ Server WebSocket connected to OpenAI')
        
        // Store the connection
        activeConnections.set(sessionId, ws)
        
        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a professional AI receptionist. Be helpful, friendly, and professional. Keep responses concise and natural for voice conversation.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            }
          }
        }
        
        ws.send(JSON.stringify(sessionConfig))
        console.log('🔐 Sent session configuration to OpenAI')
        
        resolve(NextResponse.json({ 
          success: true,
          message: 'WebSocket connection established',
          connected: true,
          sessionId
        }))
      })

      ws.on('error', (error) => {
        clearTimeout(timeout)
        console.error('❌ Server WebSocket error:', error)
        resolve(NextResponse.json({ 
          success: false,
          error: error.message,
          connected: false
        }, { status: 500 }))
      })

      ws.on('close', (code, reason) => {
        clearTimeout(timeout)
        console.log('🔌 Server WebSocket closed:', code, reason.toString())
        activeConnections.delete(sessionId)
        resolve(NextResponse.json({ 
          success: false,
          error: `WebSocket closed: ${reason}`,
          connected: false
        }, { status: 500 }))
      })

      // Handle messages from OpenAI
      ws.on('message', (data) => {
        console.log('📨 Received from OpenAI:', data.toString())
        // In a real implementation, this would forward to the client
        // For now, we'll just log it
      })
    })
  } catch (error: any) {
    console.error('Error creating WebSocket connection:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function sendMessage(sessionId: string, data: any) {
  try {
    const ws = activeConnections.get(sessionId)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return NextResponse.json({ 
        success: false,
        error: 'WebSocket connection not found or closed'
      }, { status: 404 })
    }

    console.log('📤 Sending message to OpenAI:', data)
    ws.send(JSON.stringify(data))
    
    return NextResponse.json({ 
      success: true,
      message: 'Message sent to OpenAI'
    })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function closeConnection(sessionId: string) {
  try {
    const ws = activeConnections.get(sessionId)
    if (ws) {
      ws.close()
      activeConnections.delete(sessionId)
      console.log('🔌 Closed WebSocket connection for session:', sessionId)
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Connection closed'
    })
  } catch (error: any) {
    console.error('Error closing connection:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}