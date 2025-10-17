import { NextRequest, NextResponse } from 'next/server'
import { WebSocket } from 'ws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, clientSecret } = await request.json()
    
    if (!sessionId || !clientSecret) {
      return NextResponse.json({ error: 'Session ID and client secret required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('🔐 Creating authenticated WebSocket connection...')
    
    // Create WebSocket connection with proper authentication
    const wsUrl = `wss://api.openai.com/v1/realtime?session_id=${sessionId}&client_secret=${clientSecret}`
    
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
          error: 'Connection timeout',
          connected: false
        }, { status: 500 }))
      }, 10000) // 10 second timeout

      ws.on('open', () => {
        clearTimeout(timeout)
        console.log('✅ Authenticated WebSocket connection established')
        resolve(NextResponse.json({ 
          success: true,
          message: 'Authenticated WebSocket connection established',
          connected: true
        }))
      })

      ws.on('error', (error) => {
        clearTimeout(timeout)
        console.error('❌ WebSocket connection error:', error)
        resolve(NextResponse.json({ 
          success: false,
          error: error.message,
          connected: false
        }, { status: 500 }))
      })

      ws.on('close', (code, reason) => {
        clearTimeout(timeout)
        console.log('🔌 WebSocket connection closed:', code, reason.toString())
        resolve(NextResponse.json({ 
          success: false,
          error: `Connection closed: ${code} ${reason}`,
          connected: false
        }, { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error('Error creating WebSocket connection:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
