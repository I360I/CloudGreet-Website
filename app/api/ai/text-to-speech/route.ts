import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'nova' } = await request.json()

    console.log('🎙️ TTS Request:', { textLength: text?.length, voice })

    if (!text || typeof text !== 'string') {
      console.error('❌ No text provided')
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('✅ Calling OpenAI TTS HD with voice:', voice)

    const ttsStartTime = Date.now()

    // Use OpenAI TTS HD for best quality natural voice
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd', // Highest quality for professional sound
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed: 0.98 // Slightly slower for clarity and warmth
    })
    
    const ttsTime = Date.now() - ttsStartTime
    console.log(`⚡ TTS HD generation time: ${ttsTime}ms`)

    console.log('✅ OpenAI TTS response received')

    // Convert response to buffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer())

    console.log('✅ Audio buffer created:', buffer.length, 'bytes')

    // Return audio with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache' // Changed from immutable for testing
      }
    })

  } catch (error: any) {
    console.error('TTS error:', error)
    return NextResponse.json(
      { error: 'Text-to-speech conversion failed', details: error.message },
      { status: 500 }
    )
  }
}

