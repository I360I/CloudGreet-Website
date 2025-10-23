import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Prevent OpenAI API abuse
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
  }
    const decoded = jwt.verify(token, jwtSecret) as any
    
    if (!decoded.businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { text, voice = 'nova' } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }
    
    // Limit text length to prevent abuse
    if (text.length > 4000) {
      return NextResponse.json(
        { error: 'Text too long (max 4000 characters)' },
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

    // Use TTS-1-HD for production-quality voice (same as phone system would use)
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed: 1.0 // Normal speed for natural sound
    })

    const buffer = Buffer.from(await mp3Response.arrayBuffer())
    
    logger.info('TTS generated', { 
      duration: Date.now() - start,
      textLength: text.length,
      voice
    })

    // Return audio with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache' // Changed from immutable for testing
      }
    })

  } catch (error: any) {
    logger.error('TTS generation failed', { error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error', endpoint: 'ai/text-to-speech' })
    return NextResponse.json(
      { error: 'Text-to-speech conversion failed', details: error.message },
      { status: 500 }
    )
  }
}

