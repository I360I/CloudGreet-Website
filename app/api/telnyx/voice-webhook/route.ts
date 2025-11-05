import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyTelynyxSignature } from '@/lib/webhook-verification'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Telnyx Voice Webhook Handler
 * 
 * Handles Telnyx voice call events:
 * - call.initiated → Log call start
 * - call.answered → Update call status
 * - call.ended → Log call completion, store duration
 * - call.hangup → Handle hangup events
 * 
 * Note: This webhook is for call logging and analytics.
 * Actual voice AI processing is handled by Retell AI.
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()
    
    // Verify webhook signature (Telnyx)
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')
    
    // Skip verification in development, require in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyTelynyxSignature(rawBody, signature, timestamp)
      if (!isValid) {
        logger.warn('Telnyx voice webhook signature verification failed', {
          hasSignature: !!signature,
          hasTimestamp: !!timestamp
        })
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    }

    // Parse JSON body after verification
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      logger.error('Telnyx voice webhook JSON parse error', { error: parseError instanceof Error ? parseError.message : JSON.stringify(parseError) })
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const eventType = body.data?.event_type || body.event_type || 'unknown'
    const callControlId = body.data?.call_control_id || body.call_control_id
    const callLegId = body.data?.call_leg_id || body.call_leg_id
    const phoneNumber = body.data?.to || body.to
    const fromNumber = body.data?.from || body.from

    logger.info('Telnyx voice webhook received', {
      eventType,
      callControlId,
      callLegId,
      phoneNumber,
      fromNumber
    })

    // Handle different event types
    switch (eventType) {
      case 'call.initiated':
      case 'call.answered':
      case 'call.ended':
      case 'call.hangup':
        await handleCallEvent(eventType, body.data || body, callControlId, phoneNumber, fromNumber)
        break

      default:
        logger.info('Unhandled Telnyx voice event type', { eventType })
    }

    return NextResponse.json({ success: true, received: true })

  } catch (error) {
    logger.error('Telnyx voice webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle call events from Telnyx
 */
async function handleCallEvent(
  eventType: string,
  eventData: any,
  callControlId: string | undefined,
  phoneNumber: string | undefined,
  fromNumber: string | undefined
) {
  try {
    if (!callControlId) {
      logger.warn('Call event missing call_control_id', { eventType })
      return
    }

    // Find existing call by call_control_id
    const { data: existingCall, error: findError } = await supabaseAdmin
      .from('calls')
      .select('id, business_id, call_status')
      .eq('call_id', callControlId)
      .single()

    // Determine call status based on event
    let callStatus: string
    switch (eventType) {
      case 'call.initiated':
        callStatus = 'initiated'
        break
      case 'call.answered':
        callStatus = 'answered'
        break
      case 'call.ended':
      case 'call.hangup':
        callStatus = 'completed'
        break
      default:
        callStatus = 'unknown'
    }

    // Extract call duration if available
    const duration = eventData.duration_seconds || eventData.duration || null

    if (existingCall) {
      // Update existing call
      const updateData: any = {
        call_status: callStatus,
        updated_at: new Date().toISOString()
      }

      if (duration && eventType === 'call.ended') {
        updateData.duration = duration
      }

      if (phoneNumber && !existingCall.business_id) {
        // Try to find business by phone number
        const { data: business } = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('phone', phoneNumber)
          .single()

        if (business) {
          updateData.business_id = business.id
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('calls')
        .update(updateData)
        .eq('id', existingCall.id)

      if (updateError) {
        logger.error('Failed to update call', {
          error: updateError.message,
          callId: existingCall.id,
          callControlId
        })
      } else {
        logger.info('Call updated', {
          callId: existingCall.id,
          callControlId,
          status: callStatus,
          duration
        })
      }
    } else {
      // Create new call record if initiated
      if (eventType === 'call.initiated') {
        // Try to find business by phone number
        let businessId: string | null = null
        if (phoneNumber) {
          const { data: business } = await supabaseAdmin
            .from('businesses')
            .select('id')
            .eq('phone', phoneNumber)
            .single()

          if (business) {
            businessId = business.id
          }
        }

        const { error: insertError } = await supabaseAdmin
          .from('calls')
          .insert({
            business_id: businessId,
            call_id: callControlId,
            customer_phone: fromNumber,
            call_status: callStatus,
            duration: duration || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          logger.error('Failed to create call record', {
            error: insertError.message,
            callControlId
          })
        } else {
          logger.info('Call record created', {
            callControlId,
            businessId,
            status: callStatus
          })
        }
      }
    }

  } catch (error) {
    logger.error('Error handling call event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventType,
      callControlId
    })
  }
}



