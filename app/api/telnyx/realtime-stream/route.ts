import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { call_id, session_id, from_number, to_number } = body

    console.log('Realtime stream request:', { call_id, session_id, from_number, to_number })

    // Get the OpenAI session
    const session = await openai.beta.realtime.sessions.retrieve(session_id)
    
    // Create a real-time connection
    const connection = await openai.beta.realtime.sessions.stream(session_id, {
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
      },
      tools: [
        {
          type: 'function',
          name: 'book_appointment',
          description: 'Book an appointment for the caller',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Caller name' },
              phone: { type: 'string', description: 'Caller phone number' },
              email: { type: 'string', description: 'Caller email' },
              service: { type: 'string', description: 'Service needed' },
              preferred_date: { type: 'string', description: 'Preferred appointment date' },
              preferred_time: { type: 'string', description: 'Preferred appointment time' }
            },
            required: ['name', 'phone', 'service']
          }
        }
      ]
    })

    // Handle the real-time audio stream
    const stream = new ReadableStream({
      start(controller) {
        connection.on('audio.input.speech_started', () => {
          console.log('Speech started')
        })

        connection.on('audio.input.speech_stopped', () => {
          console.log('Speech stopped')
        })

        connection.on('audio.output.speech_started', () => {
          console.log('AI speech started')
        })

        connection.on('audio.output.speech_stopped', () => {
          console.log('AI speech stopped')
        })

        connection.on('audio.output.delta', (delta) => {
          // Send audio data back to Telnyx
          controller.enqueue(delta)
        })

        connection.on('error', (error) => {
          console.error('Connection error:', error)
          controller.error(error)
        })
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'audio/pcm',
        'Transfer-Encoding': 'chunked'
      }
    })

  } catch (error) {
    console.error('Realtime stream error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to handle real-time stream'
    }, { status: 500 })
  }
}