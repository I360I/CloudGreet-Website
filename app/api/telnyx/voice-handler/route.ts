import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
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
      userSpeech: userSpeech?.substring(0, 100)
    })

    // Get call and business info
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select(`
        *,
        businesses (
          id,
          business_name,
          business_type,
          greeting_message
        ),
        ai_agents (
          id,
          agent_name,
          greeting_message,
          configuration
        )
      `)
      .eq('call_id', callId)
      .single()

    if (callError || !call) {
      logger.error('Call not found in voice handler', { callId, error: callError })
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        instructions: [
          {
            instruction: 'say',
            text: 'Sorry, we encountered an error. Please call back.',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    const business = call.businesses
    const agent = call.ai_agents

    if (!business || !agent) {
      logger.error('Business or agent not found', { callId, businessId: call.business_id })
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        instructions: [
          {
            instruction: 'say',
            text: 'Sorry, we encountered an error. Please call back.',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured')
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        instructions: [
          {
            instruction: 'say',
            text: 'Thank you for calling. Our AI system is currently being configured. Please try again later.',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    // If no speech yet, start conversation with greeting
    if (!userSpeech) {
      return NextResponse.json({
        call_id: callId,
        status: 'active',
        instructions: [
          {
            instruction: 'say',
            text: agent.greeting_message || `Thank you for calling ${business.business_name}. How can I help you today?`,
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
    }

    // Generate AI response
    const systemPrompt = `You are a professional AI receptionist for ${business.business_name}, a ${business.business_type} business. 
    
Your role is to:
- Greet customers professionally
- Qualify leads and understand their needs
- Schedule appointments when appropriate
- Provide helpful information about services
- Be friendly, professional, and efficient

Business: ${business.business_name}
Type: ${business.business_type}
Agent: ${agent.agent_name}

Keep responses concise (1-2 sentences) and conversational. Ask follow-up questions to understand their needs.`

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userSpeech }
      ],
      max_tokens: 150,
      temperature: 0.7
    })

    const aiText = aiResponse.choices[0]?.message?.content || 'I understand. How can I help you today?'

    // Check for conversation end keywords
    const endKeywords = ['goodbye', 'bye', 'thank you', 'that\'s all', 'nothing else', 'done']
    const isComplete = endKeywords.some(keyword => userSpeech.toLowerCase().includes(keyword))

    if (isComplete) {
      return NextResponse.json({
        call_id: callId,
        status: 'complete',
        instructions: [
          {
            instruction: 'say',
            text: aiText,
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

    // Update call with transcript
    await supabaseAdmin
      .from('calls')
      .update({
        transcript: `${call.transcript || ''}\nUser: ${userSpeech}\nAI: ${aiText}`.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    // Continue conversation
    return NextResponse.json({
      call_id: callId,
      status: 'active',
      instructions: [
        {
          instruction: 'say',
          text: aiText,
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
    const duration = Date.now() - startTime
    logger.error('Voice handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
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