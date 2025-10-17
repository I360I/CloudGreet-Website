import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// In-memory storage for sessions (in production, use Redis or database)
const sessions = new Map<string, any>()

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const session = sessions.get(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      clientSecret: session.clientSecret,
      businessName: session.businessName,
      createdAt: session.createdAt
    })
  } catch (error: any) {
    console.error('❌ Error getting session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, sessionId, businessName, audioData } = await request.json()
    
    console.log('🔌 Received request:', type)

    if (type === 'create_session') {
      return await createSession(businessName)
    } else if (type === 'audio_data') {
      return await handleAudioData(sessionId, audioData)
    } else if (type === 'start_listening') {
      return await startListening(sessionId)
    } else if (type === 'stop_listening') {
      return await stopListening(sessionId)
    } else {
      return NextResponse.json({ error: 'Unknown request type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('❌ Error handling request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function createSession(businessName: string) {
  try {
    console.log('🔑 Creating OpenAI Realtime session...')
    
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      instructions: `You are a professional AI receptionist for ${businessName || 'CloudGreet'}. Be helpful, friendly, and professional. When the user connects, immediately greet them warmly and ask how you can help. Keep responses concise and natural for voice conversation.`,
      modalities: ['text', 'audio'],
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 200
      }
    })

    const sessionId = (session as any).id
    const clientSecret = (session as any).client_secret
    
    console.log('✅ OpenAI session created:', sessionId)
    
    // Store session info
    sessions.set(sessionId, {
      id: sessionId,
      clientSecret: clientSecret,
      businessName: businessName,
      createdAt: new Date()
    })
    
    // Create WebSocket connection to OpenAI
    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionId}&client_secret=${clientSecret}`
    
    // For now, return session info - WebSocket handling will be done client-side
    return NextResponse.json({
      type: 'session_created',
      sessionId: sessionId,
      clientSecret: clientSecret,
      wsUrl: wsUrl,
      message: 'Session created successfully'
    })
    
  } catch (error: any) {
    console.error('❌ Error creating session:', error)
    return NextResponse.json({
      type: 'error',
      error: 'Session creation failed: ' + error.message
    }, { status: 500 })
  }
}

async function handleAudioData(sessionId: string, audioData: string) {
  try {
    if (!sessions.has(sessionId)) {
      return NextResponse.json({
        type: 'error',
        error: 'Session not found'
      }, { status: 404 })
    }

    console.log('🎤 Processing audio data for session:', sessionId)
    
    // In a real implementation, this would forward the audio to the OpenAI WebSocket
    // For now, return a mock response
    return NextResponse.json({
      type: 'audio_processed',
      sessionId: sessionId,
      message: 'Audio data received'
    })
    
  } catch (error: any) {
    console.error('❌ Error processing audio:', error)
    return NextResponse.json({
      type: 'error',
      error: 'Audio processing failed: ' + error.message
    }, { status: 500 })
  }
}

async function startListening(sessionId: string) {
  try {
    if (!sessions.has(sessionId)) {
      return NextResponse.json({
        type: 'error',
        error: 'Session not found'
      }, { status: 404 })
    }

    console.log('🎤 Starting listening for session:', sessionId)
    
    return NextResponse.json({
      type: 'listening_started',
      sessionId: sessionId,
      message: 'Started listening'
    })
    
  } catch (error: any) {
    console.error('❌ Error starting listening:', error)
    return NextResponse.json({
      type: 'error',
      error: 'Failed to start listening: ' + error.message
    }, { status: 500 })
  }
}

async function stopListening(sessionId: string) {
  try {
    if (!sessions.has(sessionId)) {
      return NextResponse.json({
        type: 'error',
        error: 'Session not found'
      }, { status: 404 })
    }

    console.log('🔇 Stopping listening for session:', sessionId)
    
    return NextResponse.json({
      type: 'listening_stopped',
      sessionId: sessionId,
      message: 'Stopped listening'
    })
    
  } catch (error: any) {
    console.error('❌ Error stopping listening:', error)
    return NextResponse.json({
      type: 'error',
      error: 'Failed to stop listening: ' + error.message
    }, { status: 500 })
  }
}
