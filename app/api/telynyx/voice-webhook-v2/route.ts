import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Telnyx Voice Webhook - Handles ALL call events
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const body = await request.json()
    
    logger.info('Telnyx webhook received', { 
      requestId, 
      event_type: body.data?.event_type,
      call_control_id: body.data?.payload?.call_control_id
    })

    // Validate webhook structure
    if (!body.data || !body.data.event_type) {
      return NextResponse.json({ error: 'Invalid webhook structure' }, { status: 400 })
    }

    const eventType = body.data.event_type
    const payload = body.data.payload || {}
    const {
      call_control_id,
      call_leg_id,
      call_session_id,
      from,
      to,
      direction,
      state,
      start_time,
      answer_time,
      end_time,
      hangup_cause,
      hangup_source,
      recording_urls,
      duration_secs,
      user_response
    } = payload

    // Route based on event type
    switch (eventType) {
      case 'call.initiated':
        return await handleCallInitiated(call_control_id, from, to, direction, requestId)
      
      case 'call.answered':
        return await handleCallAnswered(call_control_id, from, to, requestId)
      
      case 'call.speak.ended':
        return await handleSpeakEnded(call_control_id, requestId)
      
      case 'call.gather.ended':
        return await handleGatherEnded(call_control_id, user_response, requestId)
      
      case 'call.hangup':
        return await handleCallHangup(call_control_id, hangup_cause, duration_secs, requestId)
      
      case 'call.recording.saved':
        return await handleRecordingSaved(call_control_id, recording_urls, requestId)
      
      default:
        logger.info('Unhandled webhook event', { eventType, requestId })
        return NextResponse.json({ status: 'received' })
    }

  } catch (error) {
    logger.error('Voice webhook error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error'
    }, { status: 500 })
  }
}

// Handle new incoming call
async function handleCallInitiated(callId: string, from: string, to: string, direction: string, requestId: string) {
  try {
    // Find business by phone number
    const { data: phoneRecord } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('*, businesses(*)')
      .eq('number', to)
      .eq('status', 'assigned')
      .single()

    if (!phoneRecord || !phoneRecord.businesses) {
      logger.error('Business not found for number', { to, requestId })
      
      // Answer and say number not in service
      return NextResponse.json({
        actions: [
          {
            action: 'answer'
          },
          {
            action: 'speak',
            payload: {
              text: 'Thank you for calling. This number is not currently in service.',
              voice: 'female',
              language: 'en-US'
            }
          },
          {
            action: 'hangup'
          }
        ]
      })
    }

    const business = phoneRecord.businesses

    // Create call record
    await supabaseAdmin
      .from('calls')
      .insert({
        business_id: business.id,
        call_id: callId,
        from_number: from,
        to_number: to,
        direction: direction,
        status: 'initiated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    // Answer the call
    return NextResponse.json({
      actions: [
        {
          action: 'answer'
        }
      ]
    })

  } catch (error) {
    logger.error('Error handling call initiated', { error, requestId })
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// Handle call answered - Start AI conversation
async function handleCallAnswered(callId: string, from: string, to: string, requestId: string) {
  try {
    // Get business and AI agent
    const { data: phoneRecord } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('*, businesses(*)')
      .eq('number', to)
      .eq('status', 'assigned')
      .single()

    if (!phoneRecord || !phoneRecord.businesses) {
      return NextResponse.json({
        actions: [
          {
            action: 'speak',
            payload: {
              text: 'Thank you for calling. We are currently unavailable.',
              voice: 'female',
              language: 'en-US'
            }
          },
          {
            action: 'hangup'
          }
        ]
      })
    }

    const business = phoneRecord.businesses

    // Get active AI agent
    const { data: agent } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .single()

    if (!agent) {
      logger.error('No active AI agent found', { businessId: business.id, requestId })
      
      return NextResponse.json({
        actions: [
          {
            action: 'speak',
            payload: {
              text: `Thank you for calling ${business.business_name}. We are currently unavailable. Please try again later.`,
              voice: 'female',
              language: 'en-US'
            }
          },
          {
            action: 'hangup'
          }
        ]
      })
    }

    // Update call status
    await supabaseAdmin
      .from('calls')
      .update({
        status: 'answered',
        ai_agent_id: agent.id,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    // Start recording
    const recordingAction = {
      action: 'record_start',
      payload: {
        format: 'mp3',
        channels: 'single'
      }
    }

    // Greet caller with AI agent's greeting
    const greetingMessage = agent.greeting_message || 
      agent.configuration?.greeting_message ||
      `Thank you for calling ${business.business_name}. How can I help you today?`

    const voice = mapVoiceToTelnyx(agent.configuration?.voice || 'alloy')

    return NextResponse.json({
      actions: [
        recordingAction,
        {
          action: 'speak',
          payload: {
            text: greetingMessage,
            voice: voice,
            language: 'en-US'
          }
        },
        {
          action: 'gather_using_speak',
          payload: {
            text: '', // Empty - we just spoke the greeting
            voice: voice,
            language: 'en-US',
            timeout_millis: 10000,
            finish_on_key: '#',
            valid_digits: '0123456789*#',
            inter_digit_timeout_millis: 5000,
            speech_recognition: {
              enabled: true,
              language: 'en-US',
              timeout_millis: 10000
            }
          }
        }
      ]
    })

  } catch (error) {
    logger.error('Error handling call answered', { error, requestId })
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// Handle speech/DTMF input - Process with AI
async function handleGatherEnded(callId: string, userResponse: any, requestId: string) {
  try {
    const speech = userResponse?.speech
    const digits = userResponse?.digits
    const userInput = speech || digits || ''

    if (!userInput) {
      // No input - ask again
      return NextResponse.json({
        actions: [
          {
            action: 'speak',
            payload: {
              text: 'I didn\'t catch that. Could you please repeat what you need help with?',
              voice: 'female',
              language: 'en-US'
            }
          },
          {
            action: 'gather_using_speak',
            payload: {
              text: '',
              voice: 'female',
              language: 'en-US',
              timeout_millis: 10000,
              speech_recognition: {
                enabled: true,
                language: 'en-US',
                timeout_millis: 10000
              }
            }
          }
        ]
      })
    }

    // Get call details
    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('*, businesses(*)')
      .eq('call_id', callId)
      .single()

    if (!call || !call.businesses) {
      logger.error('Call not found for AI processing', { callId, requestId })
      return NextResponse.json({
        actions: [
          {
            action: 'speak',
            payload: {
              text: 'I apologize, we\'re experiencing technical difficulties. Please call back later.',
              voice: 'female',
              language: 'en-US'
            }
          },
          {
            action: 'hangup'
          }
        ]
      })
    }

    // Get conversation history for this call
    const { data: conversationHistory } = await supabaseAdmin
      .from('conversation_history')
      .select('user_message, ai_response')
      .eq('call_id', callId)
      .order('created_at', { ascending: true })

    // Call AI conversation API
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/ai/conversation-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: call.business_id,
        message: userInput,
        conversationHistory: conversationHistory || [],
        callerName: call.caller_name,
        callerPhone: call.from_number,
        callId: callId,
        callContext: 'inbound_call'
      })
    })

    const aiResult = await aiResponse.json()

    if (!aiResult.success) {
      logger.error('AI conversation failed', { callId, error: aiResult.message, requestId })
      
      return NextResponse.json({
        actions: [
          {
            action: 'speak',
            payload: {
              text: 'I apologize, I\'m having trouble right now. Let me transfer you to someone who can help.',
              voice: 'female',
              language: 'en-US'
            }
          },
          {
            action: 'hangup'
          }
        ]
      })
    }

    // Get AI agent for voice settings
    const { data: agent } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', call.business_id)
      .eq('is_active', true)
      .single()

    const voice = mapVoiceToTelnyx(agent?.configuration?.voice || 'alloy')

    // Check if AI wants to transfer or end call
    if (aiResult.shouldTransfer) {
      return NextResponse.json({
        actions: [
          {
            action: 'speak',
            payload: {
              text: aiResult.response,
              voice: voice,
              language: 'en-US'
            }
          },
          {
            action: 'hangup'
          }
        ]
      })
    }

    // Continue conversation
    return NextResponse.json({
      actions: [
        {
          action: 'speak',
          payload: {
            text: aiResult.response,
            voice: voice,
            language: 'en-US'
          }
        },
        {
          action: 'gather_using_speak',
          payload: {
            text: '', // Already spoke above
            voice: voice,
            language: 'en-US',
            timeout_millis: 10000,
            speech_recognition: {
              enabled: true,
              language: 'en-US',
              timeout_millis: 10000
            }
          }
        }
      ]
    })

  } catch (error) {
    logger.error('Error handling gather ended', { error, requestId })
    return NextResponse.json({
      actions: [
        {
          action: 'speak',
          payload: {
            text: 'I apologize for the technical difficulty. Please call back later.',
            voice: 'female',
            language: 'en-US'
          }
        },
        {
          action: 'hangup'
        }
      ]
    })
  }
}

// Handle speak ended - Wait for next input
async function handleSpeakEnded(callId: string, requestId: string) {
  // After speaking, gather user input
  return NextResponse.json({
    actions: [
      {
        action: 'gather_using_speak',
        payload: {
          text: '',
          voice: 'female',
          language: 'en-US',
          timeout_millis: 10000,
          speech_recognition: {
            enabled: true,
            language: 'en-US',
            timeout_millis: 10000
          }
        }
      }
    ]
  })
}

// Handle call hangup - Save final data
async function handleCallHangup(callId: string, hangupCause: string, duration: number, requestId: string) {
  try {
    // Stop recording
    await fetch(`https://api.telnyx.com/v2/calls/${callId}/actions/record_stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }).catch(err => logger.error('Failed to stop recording', { error: err }))

    // Update call record
    await supabaseAdmin
      .from('calls')
      .update({
        status: 'completed',
        outcome: hangupCause || 'completed',
        duration: duration || 0,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    // Get call details for notification
    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('*, businesses(*)')
      .eq('call_id', callId)
      .single()

    if (call && call.businesses) {
      // Send notification to business owner
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'client_booking',
          message: `Call completed: ${call.from_number} - Duration: ${duration}s`,
          businessId: call.business_id,
          priority: 'normal'
        })
      }).catch(err => logger.error('Failed to send call completion notification', { error: err }))
    }

    logger.info('Call completed', { callId, duration, hangupCause, requestId })

    return NextResponse.json({ status: 'call_ended' })

  } catch (error) {
    logger.error('Error handling call hangup', { error, requestId })
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// Handle recording saved - Store URL
async function handleRecordingSaved(callId: string, recordingUrls: any[], requestId: string) {
  try {
    if (!recordingUrls || recordingUrls.length === 0) {
      return NextResponse.json({ status: 'no_recording' })
    }

    const recordingUrl = recordingUrls[0]?.url

    // Update call with recording URL
    await supabaseAdmin
      .from('calls')
      .update({
        recording_url: recordingUrl,
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    logger.info('Recording saved', { callId, recordingUrl, requestId })

    return NextResponse.json({ status: 'recording_saved' })

  } catch (error) {
    logger.error('Error handling recording saved', { error, requestId })
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// Map OpenAI voices to Telnyx voices
function mapVoiceToTelnyx(openaiVoice: string): string {
  const voiceMap: Record<string, string> = {
    'alloy': 'female',
    'echo': 'male',
    'fable': 'female',
    'onyx': 'male',
    'nova': 'female',
    'shimmer': 'female'
  }
  
  return voiceMap[openaiVoice] || 'female'
}




