import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Set timeout for the entire function
    const timeoutId = setTimeout(() => {
      logger.error('Voice handler timeout - returning default response')
    }, 8000) // 8 second timeout

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
      userSpeech: userSpeech?.substring(0, 100) // Log first 100 chars only
    })

    // Simple AI response for demo
    let aiResponse = 'Thank you for your interest! I understand you need help. Let me connect you with our team.'
    
    if (userSpeech) {
      const speech = userSpeech.toLowerCase()
      
      if (speech.includes('appointment') || speech.includes('schedule') || speech.includes('book')) {
        aiResponse = 'I\'d be happy to help you schedule an appointment. What type of service do you need?'
      } else if (speech.includes('price') || speech.includes('cost') || speech.includes('quote')) {
        aiResponse = 'I can help you get a quote. What type of service are you looking for?'
      } else if (speech.includes('emergency') || speech.includes('urgent')) {
        aiResponse = 'I understand this is urgent. Let me connect you with our emergency team right away.'
      } else if (speech.includes('thank') || speech.includes('bye') || speech.includes('goodbye')) {
        aiResponse = 'Thank you for calling! Have a great day!'
      } else {
        aiResponse = 'I understand you need assistance. How can I help you today?'
      }
    }

    clearTimeout(timeoutId)

    // Return simple response
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
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'voice_handler'
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