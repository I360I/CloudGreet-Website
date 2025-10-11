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

    const start = Date.now()

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed: 1.15
    })

    const buffer = Buffer.from(await mp3Response.arrayBuffer())
    
    console.log(`⚡ TTS: ${Date.now() - start}ms for ${buffer.length} bytes`)

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

