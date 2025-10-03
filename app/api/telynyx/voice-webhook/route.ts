import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check if Telnyx is configured
    if (!process.env.TELYNX_API_KEY) {
      logger.error('Telnyx webhook called but Telnyx not configured')
      return NextResponse.json({ error: 'Telnyx not configured' }, { status: 503 })
    }

    const body = await request.json()
    
    // Validate webhook structure
    if (!body.data || !body.data.event_type || !body.data.payload) {
      logger.error('Invalid Telnyx webhook structure', { body })
      return NextResponse.json({ error: 'Invalid webhook structure' }, { status: 400 })
    }

    const {
      data: {
        event_type,
        payload: {
          call_control_id,
          from,
          to,
          call_leg_id,
          call_session_id,
          direction,
          state,
          recording_urls,
          transcription_text,
          duration,
          caller_name,
          caller_city,
          caller_state,
          caller_country
        } = {}
      }
    } = body

    // Check for duplicate webhook (idempotency)
    const { data: existingCall } = await supabaseAdmin
      .from('call_logs')
      .select('id')
      .eq('call_id', call_control_id)
      .single()

    if (existingCall) {
      // Duplicate webhook - return success without processing
      return NextResponse.json({ 
        call_id: call_control_id,
        status: 'duplicate_ignored'
      })
    }

    // Get business info for the phone number first
    const { data: phoneRecord, error: phoneError } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('*, businesses(*)')
      .eq('number', to)
      .eq('status', 'assigned')
      .single()
    
    const business = phoneRecord?.businesses
    const businessError = phoneError

    if (businessError || !business) {
      logger.error('Error finding business for webhook', { error: businessError,  to })
      return NextResponse.json({
        call_id: call_control_id,
        status: 'answered',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. We are currently unavailable. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      })
    }

    // Store call in database with comprehensive data
    const { data: call, error: callError } = await supabaseAdmin
      .from('call_logs')
      .insert({
        business_id: business.id,
        call_id: call_control_id,
        from_number: from,
        to_number: to,
        status: state,
        direction: direction,
        duration: parseInt(duration?.toString()) || 0,
        recording_url: recording_urls?.[0]?.url,
        transcription_text: transcription_text,
        outcome: state,
        satisfaction_score: null,
        cost: 0,
        caller_name: caller_name || null,
        caller_city: caller_city || null,
        caller_state: caller_state || null,
        caller_country: caller_country || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (callError) {
      logger.error('Error storing call', { error: callError,  body })
    }

    // Get AI agent configuration
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .single()

    if (agentError || !agent) {
      logger.error('Error finding active agent', { error: agentError,  businessId: business.id })
      return NextResponse.json({
        call_id: call_control_id,
        status: 'answered',
        instructions: [
          { instruction: 'say', text: `Thank you for calling ${business.business_name}. We are currently unavailable. Please try again later.`, voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      })
    }

    // Check business hours
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase() // mon, tue, wed, etc.
    const currentTime = now.getHours() * 100 + now.getMinutes() // HHMM format

    let isBusinessHours = false
    if (business.business_hours && business.business_hours[currentDay]) {
      const hours = business.business_hours[currentDay]
      if (hours.open && hours.close) {
        const openTime = parseInt(hours.open.replace(':', ''))
        const closeTime = parseInt(hours.close.replace(':', ''))
        isBusinessHours = currentTime >= openTime && currentTime <= closeTime
      }
    }

    // Generate proper Telnyx webhook response
    const webhookResponse = {
      call_id: call_control_id,
      status: 'answered',
      instructions: [] as any[]
    }

    if (isBusinessHours) {
      // Business hours - connect to AI agent
      webhookResponse.instructions = [
        {
          instruction: 'say',
          text: agent.greeting_message || `Thank you for calling ${business.business_name}. How can I help you today?`,
          voice: agent.voice || 'alloy',
          language: agent.configuration?.voice?.language || 'en'
        },
        {
          instruction: 'gather',
          input: ['dtmf', 'speech'],
          num_digits: 1,
          timeout: 10,
          speech_timeout_secs: 5,
          action: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/telnyx/voice-handler`
        },
        {
          instruction: 'say',
          text: 'Press 1 to speak with our AI assistant, or press 2 to be transferred to a human.',
          voice: agent.voice || 'alloy',
          language: agent.configuration?.voice?.language || 'en'
        }
      ]
    } else {
      // After hours
      if (business.after_hours_policy === 'voicemail') {
        webhookResponse.instructions = [
          {
            instruction: 'say',
            text: `Thank you for calling ${business.business_name}. We are currently closed. Please leave a message and we'll get back to you during business hours.`,
            voice: 'alloy'
          },
          {
            instruction: 'record',
            max_length_secs: 300,
            action: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/telnyx/voicemail-handler`
          },
          {
            instruction: 'say',
            text: 'Thank you for your message. Goodbye.',
            voice: 'alloy'
          }
        ]
      } else if (business.after_hours_policy === 'sms') {
        webhookResponse.instructions = [
          {
            instruction: 'say',
            text: `Thank you for calling ${business.business_name}. We are currently closed. Please text us at this number and we'll get back to you during business hours.`,
            voice: 'alloy'
          },
          {
            instruction: 'message',
            to: from,
            from: to,
            text: `Thank you for calling ${business.business_name}. We are currently closed but received your call. Please reply with your message and we'll get back to you during business hours.`
          },
          {
            instruction: 'hangup'
          }
        ]
      } else {
        webhookResponse.instructions = [
          {
            instruction: 'say',
            text: `Thank you for calling ${business.business_name}. We are currently closed. Please try again during business hours.`,
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      }
    }

    // Log webhook response for debugging
    logger.info('Voice webhook response generated', {
      call_id: call_control_id,
      business_id: business.id,
      is_business_hours: isBusinessHours,
      instructions_count: webhookResponse.instructions.length
    })

    return NextResponse.json(webhookResponse)

  } catch (error) {
    logger.error('Voice webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'voice_webhook', 
      body: await request.json().catch(() => ({}))
    })
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'Sorry, we\'re experiencing technical difficulties. Please try again later.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    }, { status: 500 })
  }
}
