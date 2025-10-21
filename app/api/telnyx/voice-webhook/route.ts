import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Telnyx voice webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    
    // Extract call information
    const {
      data: {
        event_type,
        payload: {
          call_control_id,
          call_leg_id,
          from,
          to,
          direction,
          state,
          duration
        } = {}
      } = {}
    } = body

    const callId = call_control_id || call_leg_id

    logger.info('Voice webhook received', { 
      event_type, 
      callId, 
      from, 
      to, 
      direction,
      state 
    })

    // Handle call.answered event
    if (event_type === 'call.answered') {
      // Fast business lookup - use phone number to find business
      const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('id, business_name, greeting_message, phone_number')
        .eq('phone_number', to)
        .single()

      if (businessError || !business) {
        logger.warn('Business not found, using demo business', { to, error: businessError })
        
        // Use demo business as fallback
        return NextResponse.json({
          call_id: callId,
          status: 'answered',
          instructions: [
            {
              instruction: 'say',
              text: 'Thank you for calling CloudGreet Demo! How can I help you today?',
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

      // Get AI agent for this business
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('ai_agents')
        .select('id, agent_name, greeting_message, configuration')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .single()

      if (agentError || !agent) {
        logger.warn('AI agent not found, using basic response', { businessId: business.id, error: agentError })
        
        return NextResponse.json({
          call_id: callId,
          status: 'answered',
          instructions: [
            {
              instruction: 'say',
              text: business.greeting_message || `Thank you for calling ${business.business_name}! How can I help you today?`,
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

      // Store call in database
      await supabaseAdmin
        .from('calls')
        .insert({
          business_id: business.id,
          call_id: callId,
          customer_phone: from,
          call_status: 'answered',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      // Return response with AI agent
      return NextResponse.json({
        call_id: callId,
        status: 'answered',
        instructions: [
          {
            instruction: 'say',
            text: agent.greeting_message || `Thank you for calling ${business.business_name}! How can I help you today?`,
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

    // Handle call.hangup event
    if (event_type === 'call.hangup') {
      // Update call status
      await supabaseAdmin
        .from('calls')
        .update({
          call_status: 'completed',
          call_duration: duration || 0,
          updated_at: new Date().toISOString()
        })
        .eq('call_id', callId)

      logger.info('Call completed', { 
        callId, 
        from, 
        to, 
        duration 
      })
      
      return NextResponse.json({
        call_id: callId,
        status: 'completed'
      })
    }

    // Handle other events
    return NextResponse.json({
      call_id: callId,
      status: 'received'
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Voice webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
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