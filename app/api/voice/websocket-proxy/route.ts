import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, clientSecret } = await request.json()
    
    if (!sessionId || !clientSecret) {
      return NextResponse.json({ error: 'Missing session credentials' }, { status: 400 })
    }

    console.log('🔐 Creating authenticated WebSocket connection to OpenAI...')
    
    // Create the WebSocket URL with proper authentication
    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionId}&client_secret=${clientSecret}`
    
    // Test the connection by creating a WebSocket with proper headers
    const WebSocket = require('ws')
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
      }, 5000) // 5 second timeout

      ws.on('open', () => {
        clearTimeout(timeout)
        console.log('✅ Server-side WebSocket connected to OpenAI with authentication')
        
        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a professional AI receptionist. Be helpful, friendly, and professional. When the user connects, immediately greet them warmly and ask how you can help. Keep responses concise and natural for voice conversation.',
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
        console.log('🔐 Sent authenticated session configuration')
        
        // Close the test connection
        ws.close()
        
        resolve(NextResponse.json({ 
          success: true,
          message: 'WebSocket authentication successful',
          connected: true,
          sessionId,
          clientSecret
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
        resolve(NextResponse.json({ 
          success: false,
          error: `Server proxy closed: ${reason}`,
          connected: false
        }, { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error('Error in WebSocket proxy:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}