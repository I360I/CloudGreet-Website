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

    console.log('Realtime audio request:', { call_id, session_id, from_number, to_number })

    // Create a streaming response for real-time audio
    const stream = new ReadableStream({
      start(controller) {
        // Connect to the Realtime API session
        // @ts-ignore - OpenAI Realtime API types may not be fully updated
        const connection = (openai.beta.realtime.sessions as any).stream(session_id, {
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

        // Handle incoming audio from Telnyx
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

        connection.on('response.function_call_arguments.done', (args) => {
          console.log('Function call:', args)
          // Handle function calls (like booking appointments)
        })

        connection.on('error', (error) => {
          console.error('Connection error:', error)
          controller.error(error)
        })

        connection.on('close', () => {
          console.log('Connection closed')
          controller.close()
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
    console.error('Realtime audio error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to handle real-time audio'
    }, { status: 500 })
  }
}
