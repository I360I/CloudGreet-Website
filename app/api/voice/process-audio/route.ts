import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const sessionId = formData.get('sessionId') as string
    const businessName = formData.get('businessName') as string
    
    if (!audioFile || !sessionId) {
      return NextResponse.json({ error: 'Missing audio file or session ID' }, { status: 400 })
    }

    console.log('🎤 Processing audio through OpenAI...')
    
    // Convert audio to base64
    const audioBuffer = await audioFile.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')
    
    // Use OpenAI's audio transcription
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
      model: 'whisper-1',
    })
    
    console.log('📝 Transcription:', transcription.text)
    
    // Generate AI response using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional AI receptionist for ${businessName || 'CloudGreet'}. Be helpful, friendly, and professional. Keep responses concise and natural for voice conversation.`
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
      sessionId
    })
    
  } catch (error: any) {
    console.error('❌ Audio processing error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
