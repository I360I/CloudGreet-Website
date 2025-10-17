import { NextRequest, NextResponse } from 'next/server'
import WebSocket from 'ws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Store active WebSocket connections
const activeConnections = new Map<string, WebSocket>()

export async function POST(request: NextRequest) {
  try {
    const { sessionId, clientSecret } = await request.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('🔐 Creating REAL OpenAI Realtime WebSocket connection...')
    
    // Create WebSocket connection to OpenAI Realtime API with proper authentication
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
          error: 'Realtime WebSocket connection timeout',
          connected: false
        }, { status: 500 }))
      }, 10000) // 10 second timeout

      openaiWs.on('open', () => {
        clearTimeout(timeout)
        console.log('✅ REAL OpenAI Realtime WebSocket connected')
        
        // Store the connection
        activeConnections.set(sessionId, openaiWs)
        
        // Send session configuration for realtime
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
        console.log('🔐 Sent REAL realtime session configuration')
        
        // Return success - the connection is ready for realtime streaming
        resolve(NextResponse.json({ 
          success: true,
          message: 'REAL Realtime WebSocket ready for streaming',
          connected: true,
          sessionId,
          clientSecret
        }))
      })

      openaiWs.on('error', (error) => {
        clearTimeout(timeout)
        console.error('❌ REAL Realtime WebSocket error:', error)
        activeConnections.delete(sessionId)
        resolve(NextResponse.json({ 
          success: false,
          error: error.message,
          connected: false
        }, { status: 500 }))
      })

      openaiWs.on('close', (code, reason) => {
        clearTimeout(timeout)
        console.log('🔌 REAL Realtime WebSocket closed:', code, reason.toString())
        activeConnections.delete(sessionId)
        resolve(NextResponse.json({ 
          success: false,
          error: `REAL Realtime connection closed: ${reason}`,
          connected: false
        }, { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error('Error creating REAL Realtime WebSocket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}