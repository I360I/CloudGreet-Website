import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'
import { AI_CONFIG } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Set timeout for the entire function
  const timeoutId = setTimeout(() => {
    logger.error('Function timeout - returning default response');
  }, AI_CONFIG.CONVERSATION_TIMEOUT_MS);
  
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

    // Get business info for AI context
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('phone_number', to)
      .single()

    if (businessError || !business) {
      logger.error('Business not found', { to, error: businessError?.message })
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        instructions: [
          {
            instruction: 'say',
            text: 'I apologize, but I cannot find your business information. Please try again later.',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    // Use fast AI responses for real-time conversation
    let aiResponse = 'Thank you for calling! How can I help you today?'
    
    if (userSpeech) {
      try {
        // Use OpenAI directly for fast responses (not the slow conversation-voice endpoint)
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })

        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo', // Fast GPT-4 for real-time responses
          messages: [
            {
              role: 'system',
              content: `You are ${business.business_name}'s AI receptionist. Be helpful, natural, and brief. Keep responses under 20 words for phone calls. If they want to book an appointment, say "I'd be happy to book that for you!"`
            },
            {
              role: 'user',
              content: userSpeech
            }
          ],
          max_tokens: 30, // Very short for real-time
          temperature: 0.7
        })

        aiResponse = completion.choices[0]?.message?.content || aiResponse
      } catch (aiError) {
        logger.error('AI conversation failed', { 
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
          callId 
        })
        return NextResponse.json({
          call_id: callId,
          status: 'error',
          instructions: [
            {
              instruction: 'say',
              text: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.',
              voice: 'alloy'
            },
            {
              instruction: 'hangup'
            }
          ]
        }, { status: 500 })
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

    // Continue conversation with real-time streaming
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
          timeout: 10,
          speech_timeout: 'auto',
          speech_model: 'default',
          action_on_empty_result: true,
          finish_on_key: '#',
          action: `${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/telnyx/voice-handler`
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
  } finally {
    clearTimeout(timeoutId);
  }
}
