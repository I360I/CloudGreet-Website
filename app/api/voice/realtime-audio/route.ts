import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { audioData, sessionId, businessName } = await request.json()
    
    if (!audioData) {
      return NextResponse.json({ error: 'Missing audio data' }, { status: 400 })
    }

    console.log('🎤 Processing realtime audio...')
    
    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64')
    
    // Create a temporary file for OpenAI
    const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' })
    
    // Use OpenAI Whisper for speech-to-text
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    })
    
    console.log('📝 Transcription:', transcription.text)
    
    // Generate AI response using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional AI receptionist for ${businessName || 'CloudGreet'}. Be helpful, friendly, and professional. Keep responses concise and natural for voice conversation. Respond as if you're talking to someone on the phone.`
        },
        {
          role: 'user',
          content: transcription.text
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })
    
    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, I didn\'t understand that. Could you please repeat?'
    
    console.log('🤖 AI Response:', aiResponse)
    
    // Convert response to speech using OpenAI TTS
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: aiResponse,
    })
    
    const audioBuffer2 = await speechResponse.arrayBuffer()
    const audioBase64Response = Buffer.from(audioBuffer2).toString('base64')
    
    console.log('🔊 Generated speech response')
    
    return NextResponse.json({
      success: true,
      response: {
        type: 'response',
        content: aiResponse,
        audio: audioBase64Response
      },
      transcription: transcription.text
    })
    
  } catch (error: any) {
    console.error('❌ Realtime audio processing error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
