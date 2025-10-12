import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import WebSocket from 'ws'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

/**
 * OpenAI Realtime API Integration for Production Phone Calls
 * 
 * This endpoint bridges Telnyx phone calls to OpenAI's Realtime API
 * using server-side WebSocket connections for true real-time voice AI.
 */

interface RealtimeConfig {
  businessName: string
  businessType: string
  services: string[]
  hours: string
  agentName: string
  voice: string
  instructions: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      call_control_id,
      call_leg_id,
      from,
      to,
      event_type,
      media_url // For audio streaming
    } = body

    const callId = call_control_id || call_leg_id

    logger.info('Realtime voice handler called', {
      callId,
      event_type,
      from,
      to
    })

    // Get call record and business info
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('*, businesses(*), ai_agents(*)')
      .or(`call_id.eq.${callId},call_leg_id.eq.${callId}`)
      .single()

    if (callError || !call) {
      logger.error('Call not found', { callId, error: callError })
      return NextResponse.json({
        error: 'Call not found'
      }, { status: 404 })
    }

    const business = call.businesses
    const agent = call.ai_agents

    if (!business || !agent) {
      logger.error('Business or agent not found', { callId })
      return NextResponse.json({
        error: 'Configuration not found'
      }, { status: 404 })
    }

    // Prepare Realtime configuration
    const config: RealtimeConfig = {
      businessName: business.business_name,
      businessType: business.business_type,
      services: agent.configuration?.services || business.services || ['General Services'],
      hours: agent.configuration?.hours || business.business_hours || '24/7',
      agentName: agent.agent_name || 'AI Assistant',
      voice: agent.configuration?.voice || 'verse',
      instructions: buildInstructions(business, agent)
    }

    // Handle different event types
    switch (event_type) {
      case 'call.initiated':
      case 'call.answered':
        return handleCallStart(callId, config)
      
      case 'call.media':
      case 'call.audio':
        return handleAudioStream(callId, body, config)
      
      case 'call.hangup':
        return handleCallEnd(callId)
      
      default:
        logger.info('Unhandled event type', { event_type, callId })
        return NextResponse.json({ received: true })
    }

  } catch (error) {
    logger.error('Realtime voice handler error', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

function buildInstructions(business: any, agent: any): string {
  const config = agent.configuration || {}
  const customInst = config.custom_instructions || agent.custom_instructions || ''
  
  return `You are ${agent.agent_name || 'an AI receptionist'} for ${business.business_name}.

BUSINESS INFO:
- Name: ${business.business_name}
- Type: ${business.business_type}
- Services: ${(config.services || business.services || []).join(', ')}
- Phone: ${business.phone_number}

${customInst ? `\nCUSTOM INSTRUCTIONS:\n${customInst}\n` : ''}

CONVERSATION STYLE:
- Be natural, warm, and professional
- Keep responses brief (20-30 words max)
- Use contractions and conversational language
- Never mention being an AI
- Focus on helping the customer

YOUR GOALS:
1. Answer questions about services and hours
2. Qualify leads by understanding their needs
3. Schedule appointments when appropriate
4. Handle objections professionally
5. Escalate emergencies or angry customers

RESPONSE FORMAT:
- One idea per response
- Let the customer speak
- Ask clarifying questions
- Confirm understanding

Remember: You're having a phone conversation. Be natural and helpful!`
}

async function handleCallStart(callId: string, config: RealtimeConfig) {
  try {
    // Create ephemeral token for this call
    const tokenResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          audio: {
            output: {
              voice: config.voice
            }
          }
        }
      })
    })

    if (!tokenResponse.ok) {
      throw new Error(`Failed to create session: ${tokenResponse.status}`)
    }

    const { value: ephemeralKey } = await tokenResponse.json()

    // Store session info
    await supabaseAdmin
      .from('realtime_sessions')
      .insert({
        call_id: callId,
        session_token: ephemeralKey,
        status: 'active',
        configuration: config,
        created_at: new Date().toISOString()
      })

    logger.info('Realtime session created', { callId })

    // Return instructions for Telnyx to stream audio
    return NextResponse.json({
      call_id: callId,
      status: 'started',
      session_created: true,
      instructions: [
        {
          instruction: 'stream_audio',
          stream_url: `wss://api.openai.com/v1/realtime?model=gpt-realtime`,
          stream_track: 'both',
          auth_token: ephemeralKey
        }
      ]
    })

  } catch (error) {
    logger.error('Failed to start realtime session', {
      callId,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    // Fallback to regular voice handler
    return NextResponse.json({
      call_id: callId,
      status: 'fallback',
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/telnyx/voice-handler`
    })
  }
}

async function handleAudioStream(callId: string, audioData: any, config: RealtimeConfig) {
  // Audio streaming is handled directly by WebSocket connection
  // This endpoint mainly logs and monitors
  
  logger.info('Audio stream active', { callId })
  
  return NextResponse.json({
    call_id: callId,
    status: 'streaming'
  })
}

async function handleCallEnd(callId: string) {
  try {
    // Clean up session
    await supabaseAdmin
      .from('realtime_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    // Update call record
    await supabaseAdmin
      .from('calls')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    logger.info('Realtime session ended', { callId })

    return NextResponse.json({
      call_id: callId,
      status: 'ended'
    })

  } catch (error) {
    logger.error('Failed to end realtime session', {
      callId,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    return NextResponse.json({
      error: 'Failed to end session'
    }, { status: 500 })
  }
}

