import { NextRequest, NextResponse } from 'next/server'
import WebSocket from 'ws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, clientSecret } = await request.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('🔐 Creating WebSocket tunnel with authentication...')
    
    // Create WebSocket connection to OpenAI with proper authentication
    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionId}&client_secret=${clientSecret}`
    
    const openaiWs = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
        'User-Agent': 'CloudGreet/1.0'
      }
    })

    return new Promise<NextResponse>((resolve) => {
      const timeout = setTimeout(() => {
        openaiWs.close()
        resolve(NextResponse.json({ 
          success: false,
          error: 'WebSocket tunnel connection timeout',
          connected: false
        }, { status: 500 }))
      }, 10000) // 10 second timeout

      openaiWs.on('open', () => {
        clearTimeout(timeout)
        console.log('✅ WebSocket tunnel connected to OpenAI with authentication')
        
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
        
        openaiWs.send(JSON.stringify(sessionConfig))
        console.log('🔐 Sent authenticated session configuration through tunnel')
        
        // Return tunnel URL for client to connect to
        resolve(NextResponse.json({ 
          success: true,
          message: 'WebSocket tunnel ready',
          connected: true,
          tunnelUrl: `wss://cloudgreet.com/api/voice/tunnel/${sessionId}`,
          sessionId,
          clientSecret
        }))
      })

      openaiWs.on('error', (error) => {
        clearTimeout(timeout)
        console.error('❌ WebSocket tunnel error:', error)
        resolve(NextResponse.json({ 
          success: false,
          error: error.message,
          connected: false
        }, { status: 500 }))
      })

      openaiWs.on('close', (code, reason) => {
        clearTimeout(timeout)
        console.log('🔌 WebSocket tunnel closed:', code, reason.toString())
        resolve(NextResponse.json({ 
          success: false,
          error: `Tunnel closed: ${reason}`,
          connected: false
        }, { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error('Error creating WebSocket tunnel:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}