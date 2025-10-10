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

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Use OpenAI TTS HD for ultra-natural voice
    // 'nova' is the warmest, most natural female voice for receptionist work
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd', // Highest quality model
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed: 0.95 // Slightly slower for more natural, conversational feel
    })

    // Convert response to buffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer())

    // Return audio with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable'
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

