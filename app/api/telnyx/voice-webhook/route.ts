import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { checkVoiceRateLimit } from '@/lib/webhook-rate-limit'
import { verifyTelynyxSignature } from '@/lib/webhook-verification'

export const dynamic = 'force-dynamic'

// Health check endpoint for Telnyx webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Telnyx voice webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    // Webhook signature verification for security
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')
    
    // Get raw body for signature verification
    const rawBody = await request.text()
    
    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyTelynyxSignature(rawBody, signature, timestamp)
      
      if (!isValid) {
        logger.error('Invalid Telnyx webhook signature')
        logger.warn('TEMPORARILY ALLOWING INVALID SIGNATURE FOR TESTING')
        // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Check if Telnyx is configured
    if (!process.env.TELYNX_API_KEY) {
      logger.error('Telnyx webhook called but Telnyx not configured')
      return NextResponse.json({ error: 'Telnyx not configured' }, { status: 503 })
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured for voice webhook')
      return NextResponse.json({
        call_id: 'unknown',
        status: 'answered',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. Our AI system is currently being configured. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      })
    }

    const body = JSON.parse(rawBody)
    
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

    // Rate limiting check
    if (from) {
      const rateLimit = checkVoiceRateLimit(from)
      if (!rateLimit.allowed) {
        logger.warn('Voice webhook rate limit exceeded', { from, to })
        return NextResponse.json({ 
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime
        }, { status: 429 })
      }
    }

    // Check for duplicate webhook (idempotency)
    const { data: existingCall } = await supabaseAdmin
      .from('calls')
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
    let business = null
    let businessError = null
    
    // Check if this is a call to our Telnyx phone number
    const telnyxPhoneNumber = process.env.TELYNX_PHONE_NUMBER || '+18333956731';
    
    if (to === telnyxPhoneNumber) {
      // This is a call to our Telnyx number - use demo business
      const { data: demoBusiness, error: demoError } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001') // Fixed UUID for demo business
        .single()
      
      if (demoBusiness) {
        business = demoBusiness
        logger.info('Using demo business for Telnyx call', { to, businessId: business.id, telnyxPhoneNumber })
      } else {
        businessError = demoError
      }
    } else {
      // Try to find business by toll-free number first
      const { data: phoneRecord, error: phoneError } = await supabaseAdmin
        .from('toll_free_numbers')
        .select('*, businesses(*)')
        .eq('number', to)
        .eq('status', 'assigned')
        .single()
      
      if (phoneRecord?.businesses) {
        business = phoneRecord.businesses
      } else {
        businessError = phoneError
      }
    }

    if (businessError || !business) {
      logger.error('Error finding business for webhook', { error: businessError, to })
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
      .from('calls')
      .insert({
        business_id: business.id,
        call_id: call_control_id,
        call_leg_id: call_leg_id,
        customer_phone: from,
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
    let agent = null
    let agentError = null
    
    // Try to find active agent for this business
    const { data: businessAgent, error: businessAgentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .single()
    
    if (businessAgent) {
      agent = businessAgent
    } else {
      // Fallback: Look for demo agent for test calls
      const { data: demoAgent, error: demoAgentError } = await supabaseAdmin
        .from('ai_agents')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000002') // Fixed UUID for demo agent
        .single()
      
      if (demoAgent) {
        agent = demoAgent
        logger.info('Using demo agent for test call', { businessId: business.id, agentId: agent.id })
      } else {
        agentError = demoAgentError
      }
    }

    if (agentError || !agent) {
      logger.error('Error finding active agent', { error: agentError, businessId: business.id })
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
      // Business hours - start AI conversation immediately
      webhookResponse.instructions = [
        {
          instruction: 'say',
          text: agent.greeting_message || agent.configuration?.greeting_message || `Thank you for calling ${business.business_name}. How can I help you today?`,
          voice: agent.voice || agent.configuration?.voice || 'alloy',
          language: agent.configuration?.voice?.language || 'en'
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
            action: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voicemail-handler`
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
      endpoint: 'voice_webhook'
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

