import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      call_control_id,
      call_leg_id, 
      from,
      to,
      SpeechResult,
      Digits
    } = body

    const callId = call_control_id || call_leg_id
    const userSpeech = SpeechResult || body.speech?.text || body.transcription_text

    logger.info('Voice handler called', {
      callId,
      from,
      to,
      userSpeech: userSpeech?.substring(0, 50)
    })

    // Simple AI responses without database or OpenAI calls
    let aiResponse = 'Thank you for your interest! How can I help you today?'
    
    if (userSpeech) {
      const speech = userSpeech.toLowerCase()
      
      if (speech.includes('appointment') || speech.includes('schedule') || speech.includes('book')) {
        aiResponse = 'I\'d be happy to help you schedule an appointment. What type of service do you need?'
      } else if (speech.includes('price') || speech.includes('cost') || speech.includes('quote')) {
        aiResponse = 'I can help you get a quote. What type of service are you looking for?'
      } else if (speech.includes('emergency') || speech.includes('urgent')) {
        aiResponse = 'I understand this is urgent. Let me connect you with our emergency team right away.'
      } else if (speech.includes('hvac') || speech.includes('heating') || speech.includes('cooling')) {
        aiResponse = 'I can help you with your HVAC needs. What specific issue are you experiencing?'
      } else if (speech.includes('thank') || speech.includes('bye') || speech.includes('goodbye')) {
        aiResponse = 'Thank you for calling! Have a great day!'
      } else if (speech.includes('hello') || speech.includes('hi')) {
        aiResponse = 'Hello! Thank you for calling CloudGreet Demo. How can I help you today?'
      } else {
        aiResponse = 'I understand you need assistance. How can I help you today?'
      }
    }

    // Check for conversation end keywords
    const endKeywords = ['goodbye', 'bye', 'thank you', 'that\'s all', 'nothing else', 'done']
    const isComplete = endKeywords.some(keyword => userSpeech?.toLowerCase().includes(keyword))

    if (isComplete) {
      return NextResponse.json({
        call_id: callId,
        status: 'complete',
        instructions: [
          {
            instruction: 'say',
            text: aiResponse,
            voice: 'alloy'
          },
          {
            instruction: 'say',
            text: 'Thank you for calling! Have a great day!',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    // Continue conversation
    return NextResponse.json({
      call_id: callId,
      status: 'active',
      instructions: [
        {
          instruction: 'say',
          text: aiResponse,
          voice: 'alloy'
        },
        {
          instruction: 'gather',
          input: ['speech'],
          timeout: 15,
          speech_timeout: 'auto',
          speech_model: 'default',
          action_on_empty_result: true,
          finish_on_key: '#',
          action: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-handler`
        }
      ]
    })

  } catch (error) {
    logger.error('Voice handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'I apologize, but I\'m having trouble processing your request. Let me have someone call you back shortly.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    }, { status: 500 })
  }
}