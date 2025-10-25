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
      call_id,
      audio_data,
      business_id,
      conversation_state = {}
    } = body

    logger.info('Realtime stream handler called', { call_id, hasAudio: !!audio_data })

    // Get business and AI agent configuration
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('id', business_id)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for realtime stream', { business_id, error: businessError?.message })
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const agent = business.ai_agents
    const businessName = business.business_name || 'CloudGreet'
    const businessType = business.business_type || 'AI Receptionist Service'
    const services = agent?.configuration?.services || business.services || ['General Services']
    const hours = agent?.configuration?.hours || business.business_hours || '24/7'
    const voice = agent?.configuration?.voice || 'alloy'

    // Create OpenAI Realtime API session with latest 2025 model
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-realtime-preview-2025-10-25',
      voice: voice as any,
      instructions: `You are ${businessName}'s AI receptionist - a professional, helpful assistant for a ${businessType} business.

BUSINESS DETAILS:
- Company: ${businessName}
- Type: ${businessType}
- Services: ${services.join(', ')}
- Hours: ${hours}
- Phone: ${business.phone_number}

INSTRUCTIONS:
- Be warm, professional, and helpful
- Keep responses brief for phone calls (under 20 words)
- If they want to book an appointment, say "I'd be happy to book that for you!"
- Ask for their name and phone number if booking
- Be conversational and natural
- If they ask about services, mention ${services.join(', ')}
- If they ask about hours, say "${hours}"

This is a real-time phone conversation. Respond naturally and helpfully.`,
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
              customer_name: {
                type: 'string',
                description: 'Customer name'
              },
              customer_phone: {
                type: 'string',
                description: 'Customer phone number'
              },
              service_type: {
                type: 'string',
                description: 'Type of service requested'
              },
              preferred_date: {
                type: 'string',
                description: 'Preferred appointment date'
              },
              notes: {
                type: 'string',
                description: 'Additional notes'
              }
            },
            required: ['customer_name', 'customer_phone']
          }
        }
      ]
    })

    // Handle the actual conversation if audio data is provided
    if (audio_data) {
      try {
        // Process the audio input
        const audioBuffer = Buffer.from(audio_data, 'base64')
        
        // Send audio to OpenAI Realtime API
        await session.audio.input.speak(audioBuffer)
        
        // Get the AI response
        const response = await session.audio.output.listen()
        
        // Return the audio response
        return NextResponse.json({
          success: true,
          audio_response: response.toString('base64'),
          session_id: session.id,
          message: 'Realtime conversation processed'
        })
      } catch (audioError) {
        logger.error('Audio processing error', { 
          error: audioError instanceof Error ? audioError.message : 'Unknown error',
          call_id 
        })
        
        // Fallback to text response with latest 2025 model
        const textResponse = await openai.chat.completions.create({
          model: 'gpt-4o-realtime-preview-2025-10-25',
          messages: [{
            role: 'system',
            content: `You are ${businessName}'s AI receptionist. Be helpful and professional.`
          }, {
            role: 'user',
            content: 'Hello, I need assistance'
          }],
          max_tokens: 50
        })
        
        return NextResponse.json({
          success: true,
          text_response: textResponse.choices[0]?.message?.content || 'Hello! How can I help you today?',
          session_id: session.id,
          message: 'Text response generated'
        })
      }
    }

    // If no audio data, just return session info
    return NextResponse.json({
      success: true,
      session_id: session.id,
      message: 'Realtime conversation session created'
    })

  } catch (error) {
    logger.error('Realtime stream error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Failed to start realtime conversation' 
    }, { status: 500 })
  }
}

async function handleAppointmentBooking(parameters: any, businessId: string, callId: string) {
  try {
    const { customer_name, customer_phone, service_type, preferred_date, notes } = parameters

    // Create appointment in database
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
      const billingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/per-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          amount: 50,
          description: `Appointment booking for ${customer_name}`,
          appointmentId: appointment.id
        })
      })

      if (!billingResponse.ok) {
        logger.error('Failed to charge booking fee', { businessId, appointmentId: appointment.id })
      }
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
