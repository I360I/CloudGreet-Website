import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { businessName } = await request.json()
    
    console.log('🚀 Creating OpenAI Realtime WebRTC session...')
    
    // Create a realtime session with WebRTC support
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

    console.log('✅ OpenAI Realtime WebRTC session created:', (session as any).id)

    return NextResponse.json({
      session_id: (session as any).id,
      client_secret: (session as any).client_secret,
      message: 'WebRTC session created successfully'
    })

  } catch (error: any) {
    console.error('❌ Error creating WebRTC session:', error)
    return NextResponse.json({
      error: error.message,
      message: 'Failed to create WebRTC session'
    }, { status: 500 })
  }
}
