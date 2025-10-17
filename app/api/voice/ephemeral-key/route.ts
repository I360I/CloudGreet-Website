import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Create session with OpenAI Realtime API to get ephemeral key
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ OpenAI session creation failed:', errorData)
      return NextResponse.json({ error: 'Failed to create OpenAI session' }, { status: 500 })
    }

    const sessionData = await response.json()
    console.log('✅ OpenAI session created:', sessionData)

    return NextResponse.json({
      session_id: sessionData.id,
      client_secret: sessionData.client_secret,
      ephemeral_key: sessionData.client_secret.value,
      status: 'ready'
    })

  } catch (error: any) {
    console.error('❌ Ephemeral key creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
