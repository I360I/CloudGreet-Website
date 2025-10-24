import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      call_control_id,
      call_leg_id,
      from,
      to,
      event_type,
      SpeechResult,
      Digits,
      media_url
    } = body

    const callId = call_control_id || call_leg_id
    const userSpeech = SpeechResult || body.speech?.text || body.transcription_text

    logger.info('Unified voice handler called', {
      callId,
      event_type,
      from,
      to,
      hasSpeech: !!userSpeech,
      hasMedia: !!media_url
    })

    // Handle call start
    if (event_type === 'call.answered' || !event_type) {
      return handleCallStart(callId, from, to)
    }

    // Handle call hangup
    if (event_type === 'call.hangup') {
      return handleCallEnd(callId, from, to)
    }

    // Handle speech input with real-time AI
    if (userSpeech) {
      return handleSpeechInput(callId, from, to, userSpeech)
    }

    // Handle media streaming for real-time conversation
    if (media_url) {
      return handleMediaStream(callId, from, to, media_url)
    }

    return NextResponse.json({
      call_id: callId,
      status: 'active',
      message: 'Voice handler ready'
    })

  } catch (error) {
    logger.error('Unified voice handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      callId: body?.call_control_id || body?.call_leg_id 
    })
    
    return NextResponse.json({
      call_id: body?.call_control_id || body?.call_leg_id,
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

async function handleCallStart(callId: string, from: string, to: string) {
  try {
    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('phone_number', to)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for call start', { to, error: businessError?.message })
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

    // Create call record
    await supabaseAdmin
      .from('calls')
      .insert({
        call_id: callId,
        caller_phone: from,
        business_phone: to,
        business_id: business.id,
        status: 'active',
        started_at: new Date().toISOString()
      })

    const agent = business.ai_agents
    const greeting = agent?.greeting_message || business.greeting_message || `Hello! Thank you for calling ${business.business_name}. How can I help you today?`
    const voice = agent?.configuration?.voice || 'alloy'

    logger.info('Call started with real-time AI', { callId, businessName: business.business_name })

    // Start real-time conversation
    return NextResponse.json({
      call_id: callId,
      status: 'answered',
      instructions: [
        {
          instruction: 'say',
          text: greeting,
          voice: voice
        },
        {
          instruction: 'stream_audio',
          stream_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/realtime-stream`,
          stream_url_method: 'POST',
          stream_url_payload: {
            call_id: callId,
            business_id: business.id,
            conversation_state: {}
          }
        },
        {
          instruction: 'record',
          recording_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/recording/${callId}`
        }
      ]
    })

  } catch (error) {
    logger.error('Call start error', { error: error instanceof Error ? error.message : 'Unknown error', callId })
    return NextResponse.json({
      call_id: callId,
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'I apologize, but I\'m having trouble connecting. Please try again later.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    })
  }
}

async function handleCallEnd(callId: string, from: string, to: string) {
  try {
    // Update call record
    await supabaseAdmin
      .from('calls')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    logger.info('Call ended', { callId, from, to })

    return NextResponse.json({
      call_id: callId,
      status: 'completed'
    })

  } catch (error) {
    logger.error('Call end error', { error: error instanceof Error ? error.message : 'Unknown error', callId })
    return NextResponse.json({
      call_id: callId,
      status: 'completed'
    })
  }
}

async function handleSpeechInput(callId: string, from: string, to: string, userSpeech: string) {
  try {
    // Get business and AI agent
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('phone_number', to)
      .single()

    if (businessError || !business) {
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        instructions: [
          {
            instruction: 'say',
            text: 'I apologize, but I cannot find your business information.',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    const agent = business.ai_agents
    const voice = agent?.configuration?.voice || 'alloy'

    // Use real-time AI for natural conversation
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: voice as any,
      instructions: buildRealtimeInstructions(business, agent),
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      tools: [
        {
          type: 'function',
          name: 'book_appointment',
          description: 'Book an appointment for the customer',
          parameters: {
            type: 'object',
            properties: {
              customer_name: { type: 'string', description: 'Customer name' },
              customer_phone: { type: 'string', description: 'Customer phone number' },
              service_type: { type: 'string', description: 'Type of service requested' },
              preferred_date: { type: 'string', description: 'Preferred appointment date' },
              notes: { type: 'string', description: 'Additional notes' }
            },
            required: ['customer_name', 'customer_phone']
          }
        }
      ]
    })

    // Process speech with real-time AI
    await session.audio.input.speak(userSpeech)

    // Set up real-time response handling
    session.on('conversation.item.tool_call', (event: any) => {
      if (event.tool_call?.name === 'book_appointment') {
        handleAppointmentBooking(event.tool_call.parameters, business.id, callId)
      }
    })

    // Get AI response
    const response = await session.audio.output.speech.completed

    return NextResponse.json({
      call_id: callId,
      status: 'active',
      instructions: [
        {
          instruction: 'say',
          text: response,
          voice: voice
        },
        {
          instruction: 'gather',
          input: ['speech'],
          timeout: 10,
          speech_timeout: 'auto',
          speech_model: 'default',
          action_on_empty_result: true,
          finish_on_key: '#',
          action: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/unified-voice`
        }
      ]
    })

  } catch (error) {
    logger.error('Speech input error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      callId,
      userSpeech: userSpeech.substring(0, 50)
    })
    
    return NextResponse.json({
      call_id: callId,
      status: 'active',
      instructions: [
        {
          instruction: 'say',
          text: 'I understand you need assistance. How can I help you today?',
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
          action: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/unified-voice`
        }
      ]
    })
  }
}

async function handleMediaStream(callId: string, from: string, to: string, mediaUrl: string) {
  // Handle real-time media streaming for continuous conversation
  return NextResponse.json({
    call_id: callId,
    status: 'streaming',
    message: 'Real-time media stream active'
  })
}

function buildRealtimeInstructions(business: any, agent: any): string {
  const businessName = business.business_name || 'CloudGreet'
  const businessType = business.business_type || 'AI Receptionist Service'
  const services = agent?.configuration?.services || business.services || ['General Services']
  const hours = agent?.configuration?.hours || business.business_hours || '24/7'
  const tone = agent?.configuration?.tone || 'professional'

  return `You are ${businessName}'s AI receptionist - a professional, helpful assistant for a ${businessType} business.

BUSINESS DETAILS:
- Company: ${businessName}
- Type: ${businessType}
- Services: ${services.join(', ')}
- Hours: ${hours}
- Phone: ${business.phone_number}
- Tone: ${tone}

INSTRUCTIONS:
- Be warm, professional, and helpful
- Keep responses brief for phone calls (under 20 words)
- If they want to book an appointment, say "I'd be happy to book that for you!"
- Ask for their name and phone number if booking
- Be conversational and natural
- If they ask about services, mention ${services.join(', ')}
- If they ask about hours, say "${hours}"
- Match the ${tone} tone requested

This is a real-time phone conversation. Respond naturally and helpfully.`
}

async function handleAppointmentBooking(parameters: any, businessId: string, callId: string) {
  try {
    const { customer_name, customer_phone, service_type, preferred_date, notes } = parameters

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_name: customer_name,
        customer_phone: customer_phone,
        service_type: service_type || 'General Service',
        scheduled_date: preferred_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        notes: notes || '',
        source: 'ai_realtime_call',
        call_id: callId
      })
      .select()
      .single()

    if (appointmentError) {
      logger.error('Failed to create appointment', { 
        error: appointmentError.message,
        businessId,
        callId 
      })
      return
    }

    // Charge per-booking fee
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/per-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          amount: 50,
          description: `Appointment booking for ${customer_name}`,
          appointmentId: appointment.id
        })
      })
    } catch (billingError) {
      logger.error('Billing error', { 
        error: billingError instanceof Error ? billingError.message : 'Unknown error',
        businessId,
        appointmentId: appointment.id 
      })
    }

    // Send SMS confirmation
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer_phone,
          message: `Hi ${customer_name}! Your appointment has been booked for ${preferred_date || 'tomorrow'}. We'll call you to confirm the details. Thank you!`,
          businessId
        })
      })
    } catch (smsError) {
      logger.error('SMS confirmation failed', { 
        error: smsError instanceof Error ? smsError.message : 'Unknown error',
        customer_phone 
      })
    }

    logger.info('Appointment booked successfully', { 
      appointmentId: appointment.id,
      businessId,
      customer_name,
      customer_phone 
    })

  } catch (error) {
    logger.error('Appointment booking error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId,
      callId 
    })
  }
}
