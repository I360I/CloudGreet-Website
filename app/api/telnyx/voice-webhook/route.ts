import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // 30 seconds max for webhook

/**
 * Unified Telnyx Voice Webhook Handler
 * 
 * This is the single entry point for all Telnyx voice events.
 * Handles: call.initiated, call.answered, call.missed, call.no_answer, 
 * call.hangup, call.recording.saved
 */

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    
    // Extract call information from Telnyx webhook (supports multiple payload formats)
    const callId = body.data?.payload?.call_control_id || body.call_control_id || body.data?.payload?.call_session_id
    const fromNumber = body.data?.payload?.from || body.from || body.data?.payload?.caller_id_number
    const toNumber = body.data?.payload?.to || body.to || body.data?.payload?.called_number
    const eventType = body.data?.event_type || body.event_type || body.type

    logger.info('Telnyx webhook received', { 
      requestId,
      callId, 
      fromNumber, 
      toNumber, 
      eventType 
    })

    if (!callId || !eventType) {
      logger.warn('Missing required webhook fields', { requestId, body: JSON.stringify(body).substring(0, 200) })
      return NextResponse.json({ received: true }, { status: 200 }) // Still acknowledge
    }

    // Handle different event types
    switch (eventType) {
      case 'call.initiated':
        return await handleCallInitiated(callId, fromNumber, toNumber, body, requestId)
      
      case 'call.answered':
        return await handleCallAnswered(callId, fromNumber, toNumber, body, requestId)
      
      case 'call.missed':
      case 'call.no_answer':
        return await handleCallMissed(callId, fromNumber, toNumber, body, requestId)
      
      case 'call.hangup':
        return await handleCallHangup(callId, fromNumber, toNumber, body, requestId)
      
      case 'call.recording.saved':
        return await handleRecordingSaved(callId, body, requestId)
      
      default:
        logger.info('Unhandled event type', { requestId, eventType })
        return NextResponse.json({ received: true }, { status: 200 })
    }

  } catch (error) {
    logger.error('Voice webhook error', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: Date.now() - startTime
    })
    
    return NextResponse.json({
      status: 'error',
      message: 'Voice webhook processing error'
    }, { status: 500 })
  }
}

/**
 * Handle call initiation - store call record
 */
async function handleCallInitiated(
  callId: string, 
  fromNumber: string, 
  toNumber: string,
  body: any,
  requestId: string
) {
  try {
    // Look up business by phone number
    const business = await getBusinessByPhoneNumber(toNumber)
    
    if (!business) {
      logger.warn('Business not found for call initiation', { requestId, toNumber })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Create call record
    const { error: callError } = await supabaseAdmin.from('calls').insert({
      call_id: callId,
      business_id: business.id,
      from_number: fromNumber,
      to_number: toNumber,
      status: 'initiated',
      direction: 'inbound',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    
    // Handle duplicate key errors gracefully
    if (callError && callError.code !== '23505') {
      logger.error('Failed to create call record', { requestId, error: callError.message })
    }

    logger.info('Call initiated', { requestId, callId, businessId: business.id })
    
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    logger.error('Call initiated handler error', { requestId, error })
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

/**
 * Handle call answered - route to AI handler
 */
async function handleCallAnswered(
  callId: string,
  fromNumber: string,
  toNumber: string,
  body: any,
  requestId: string
) {
  try {
    // Look up business by phone number
    const business = await getBusinessByPhoneNumber(toNumber)
    
    if (!business) {
      logger.error('Business not found for answered call', { requestId, toNumber })
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

    // Get AI agent configuration
    const { data: agent } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', business.id)
      .single()

    // Update call record
    const { error: updateError } = await supabaseAdmin
      .from('calls')
      .update({
        status: 'answered',
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)
    
    if (updateError) {
      // If call record doesn't exist, create it
      const { error: insertError } = await supabaseAdmin.from('calls').insert({
        call_id: callId,
        business_id: business.id,
        from_number: fromNumber,
        to_number: toNumber,
        status: 'answered',
        direction: 'inbound',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      if (insertError) {
        logger.warn('Failed to create call record on update', { requestId, callId, error: insertError.message })
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
    
    // Build greeting message
    const greeting = agent?.greeting_message || 
                     business.greeting_message || 
                     `Hello! Thank you for calling ${business.business_name}. How can I help you today?`

    // Route to voice handler with business context
    return NextResponse.json({
      call_id: callId,
      status: 'answered',
      instructions: [
        {
          instruction: 'record',
          format: 'mp3',
          channels: 'single'
        },
        {
          instruction: 'say',
          text: greeting,
          voice: agent?.voice || business.voice || 'alloy'
        },
        {
          instruction: 'gather',
          input: ['speech'],
          speech: {
            timeout: 10,
            language: 'en-US',
            model: 'default'
          },
          action_url: `${baseUrl}/api/telnyx/voice-handler`,
          action_url_method: 'POST',
          partial_result_callback_url: `${baseUrl}/api/telnyx/voice-handler`,
          partial_result_callback_method: 'POST'
        }
      ]
    })

  } catch (error) {
    logger.error('Call answered handler error', { requestId, error })
    
    return NextResponse.json({
      call_id: callId,
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'I apologize, but I am experiencing technical difficulties. Please try again later.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    }, { status: 500 })
  }
}

/**
 * Handle missed call - trigger recovery SMS
 */
async function handleCallMissed(
  callId: string,
  fromNumber: string,
  toNumber: string,
  body: any,
  requestId: string
) {
  try {
    const business = await getBusinessByPhoneNumber(toNumber)
    
    if (!business) {
      logger.warn('Business not found for missed call', { requestId, toNumber })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Update or create call record as missed
    await supabaseAdmin
      .from('calls')
      .upsert({
        call_id: callId,
        business_id: business.id,
        from_number: fromNumber,
        to_number: toNumber,
        status: 'missed',
        direction: 'inbound',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'call_id'
      })

    // Store recovery job in database (serverless-safe approach)
    // Schedule recovery for 30 seconds from now to avoid spam if they call back
    const scheduledAt = new Date(Date.now() + 30 * 1000).toISOString()
    
    const { error: recoveryError } = await supabaseAdmin
      .from('missed_call_recoveries')
      .insert({
        business_id: business.id,
        call_id: callId,
        caller_phone: fromNumber,
        reason: 'missed_call',
        status: 'pending',
        scheduled_at: scheduledAt,
        created_at: new Date().toISOString()
      })
    
    // Handle duplicate key errors gracefully
    if (recoveryError && recoveryError.code !== '23505') {
      logger.error('Failed to schedule missed call recovery', { requestId, callId, error: recoveryError.message })
    }

    // Trigger immediate processing (endpoint will check if it's time to send)
    // Also works with cron jobs that call /api/calls/process-recoveries
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
    
    // Fire and forget - don't wait for response
    fetch(`${baseUrl}/api/calls/process-recoveries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(error => {
      // Silently fail - cron job will pick it up
      logger.warn('Immediate recovery processing failed, will be handled by cron', { requestId, callId })
    })

    logger.info('Missed call processed', { requestId, callId, businessId: business.id })
    
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    logger.error('Missed call handler error', { requestId, error })
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

/**
 * Handle call hangup - update call status
 */
async function handleCallHangup(
  callId: string,
  fromNumber: string,
  toNumber: string,
  body: any,
  requestId: string
) {
  try {
    const duration = body.data?.payload?.duration_seconds || body.duration || 0

    await supabaseAdmin
      .from('calls')
      .update({
        status: 'completed',
        duration: duration,
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    logger.info('Call hangup processed', { requestId, callId, duration })
    
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    logger.error('Call hangup handler error', { requestId, error })
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

/**
 * Handle recording saved - store recording URL
 */
async function handleRecordingSaved(
  callId: string,
  body: any,
  requestId: string
) {
  try {
    const recordingUrls = body.data?.payload?.recording_urls || body.recording_urls || []
    const recordingUrl = recordingUrls[0] || body.recording_url
    
    if (!recordingUrl) {
      logger.warn('Recording saved but no URL provided', { requestId, callId })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    await supabaseAdmin
      .from('calls')
      .update({
        recording_url: recordingUrl,
        recording_duration: body.data?.payload?.duration || body.duration,
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    logger.info('Recording URL stored', { requestId, callId, recordingUrl })
    
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    logger.error('Recording saved handler error', { requestId, error })
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

/**
 * Helper: Get business by phone number
 */
async function getBusinessByPhoneNumber(phoneNumber: string) {
  try {
    if (!phoneNumber) return null

    // Normalize phone number (remove formatting)
    const normalized = phoneNumber.replace(/\D/g, '')

    // Try exact match first
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    if (business) return business

    // Try normalized match
    const { data: businessNormalized } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .or(`phone_number.ilike.%${normalized}%,phone.ilike.%${normalized}%`)
      .limit(1)
      .single()

    return businessNormalized || null

  } catch (error) {
    logger.error('Failed to get business by phone', { phoneNumber, error })
    return null
  }
}