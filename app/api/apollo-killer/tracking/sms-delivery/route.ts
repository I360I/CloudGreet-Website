import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyTelnyxSignature } from '@/lib/telnyx'

export const dynamic = 'force-dynamic'

/**
 * SMS Delivery Status Webhook
 * 
 * Receives delivery status updates from Telnyx
 * Updates lead engagement metrics based on SMS delivery/replies
 */

export async function POST(request: NextRequest) {
  try {
    // Verify Telnyx signature for security
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')
    
    const body = await request.text()
    
    // Only verify signature if we have the public key configured
    if (process.env.TELNYX_PUBLIC_KEY && signature && timestamp) {
      const isValid = verifyTelnyxSignature(body, signature, timestamp)
      if (!isValid) {
        logger.error('Invalid Telnyx signature', { signature, timestamp })
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const webhookData = JSON.parse(body)
    const { data: eventData } = webhookData

    if (!eventData) {
      return NextResponse.json({ error: 'No event data' }, { status: 400 })
    }

    const { event_type, payload } = eventData

    // Handle different SMS events
    switch (event_type) {
      case 'message.sent':
        await handleMessageSent(payload)
        break
        
      case 'message.delivered':
        await handleMessageDelivered(payload)
        break
        
      case 'message.received':
        await handleMessageReceived(payload)
        break
        
      case 'message.delivery_failed':
        await handleMessageFailed(payload)
        break
        
      default:
        logger.info('Unhandled SMS event type', { event_type })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('SMS webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * Handle message sent confirmation
 */
async function handleMessageSent(payload: any) {
  try {
    const phoneNumber = payload.to?.[0]?.phone_number
    const messageId = payload.id

    if (!phoneNumber) return

    // Find lead by phone number
    const { data: lead } = await supabaseAdmin
      .from('enriched_leads')
      .select('id, business_name')
      .eq('owner_phone', phoneNumber)
      .single()

    if (lead) {
      // Log SMS sent
      await supabaseAdmin
        .from('sms_tracking_events')
        .insert({
          lead_id: lead.id,
          message_id: messageId,
          event_type: 'sent',
          phone_number: phoneNumber,
          timestamp: new Date().toISOString(),
          metadata: {
            direction: 'outbound',
            status: 'sent'
          }
        })

      logger.info('SMS sent confirmed', {
        leadId: lead.id,
        business: lead.business_name,
        messageId
      })
    }
  } catch (error) {
    logger.error('Failed to handle message sent', { error, payload })
  }
}

/**
 * Handle message delivered confirmation
 */
async function handleMessageDelivered(payload: any) {
  try {
    const phoneNumber = payload.to?.[0]?.phone_number
    const messageId = payload.id

    if (!phoneNumber) return

    // Find lead by phone number
    const { data: lead } = await supabaseAdmin
      .from('enriched_leads')
      .select('id, business_name, sms_delivered')
      .eq('owner_phone', phoneNumber)
      .single()

    if (lead) {
      // Update delivery count
      await supabaseAdmin
        .from('enriched_leads')
        .update({
          sms_delivered: (lead.sms_delivered || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)

      // Log SMS delivered
      await supabaseAdmin
        .from('sms_tracking_events')
        .insert({
          lead_id: lead.id,
          message_id: messageId,
          event_type: 'delivered',
          phone_number: phoneNumber,
          timestamp: new Date().toISOString(),
          metadata: {
            direction: 'outbound',
            status: 'delivered'
          }
        })

      logger.info('SMS delivered', {
        leadId: lead.id,
        business: lead.business_name,
        messageId
      })
    }
  } catch (error) {
    logger.error('Failed to handle message delivered', { error, payload })
  }
}

/**
 * Handle incoming message (reply)
 */
async function handleMessageReceived(payload: any) {
  try {
    const phoneNumber = payload.from?.phone_number
    const messageText = payload.text
    const messageId = payload.id

    if (!phoneNumber) return

    // Find lead by phone number
    const { data: lead } = await supabaseAdmin
      .from('enriched_leads')
      .select('id, business_name')
      .eq('owner_phone', phoneNumber)
      .single()

    if (lead) {
      // Mark as SMS responded
      await supabaseAdmin
        .from('enriched_leads')
        .update({
          sms_responded: true,
          last_sms_response_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)

      // Log SMS reply
      await supabaseAdmin
        .from('sms_tracking_events')
        .insert({
          lead_id: lead.id,
          message_id: messageId,
          event_type: 'received',
          phone_number: phoneNumber,
          message_text: messageText,
          timestamp: new Date().toISOString(),
          metadata: {
            direction: 'inbound',
            status: 'received'
          }
        })

      logger.info('SMS reply received', {
        leadId: lead.id,
        business: lead.business_name,
        messageId,
        messagePreview: messageText?.substring(0, 50)
      })

      // Check for STOP/UNSUBSCRIBE keywords
      if (messageText && /\b(stop|unsubscribe|opt.?out)\b/i.test(messageText)) {
        await supabaseAdmin
          .from('enriched_leads')
          .update({
            outreach_status: 'do_not_contact',
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id)

        logger.info('Lead opted out via SMS', {
          leadId: lead.id,
          business: lead.business_name
        })
      }
    }
  } catch (error) {
    logger.error('Failed to handle message received', { error, payload })
  }
}

/**
 * Handle message delivery failure
 */
async function handleMessageFailed(payload: any) {
  try {
    const phoneNumber = payload.to?.[0]?.phone_number
    const messageId = payload.id
    const errorCode = payload.errors?.[0]?.code
    const errorMessage = payload.errors?.[0]?.detail

    if (!phoneNumber) return

    // Find lead by phone number
    const { data: lead } = await supabaseAdmin
      .from('enriched_leads')
      .select('id, business_name')
      .eq('owner_phone', phoneNumber)
      .single()

    if (lead) {
      // Log SMS failure
      await supabaseAdmin
        .from('sms_tracking_events')
        .insert({
          lead_id: lead.id,
          message_id: messageId,
          event_type: 'failed',
          phone_number: phoneNumber,
          timestamp: new Date().toISOString(),
          metadata: {
            direction: 'outbound',
            status: 'failed',
            errorCode,
            errorMessage
          }
        })

      logger.error('SMS delivery failed', {
        leadId: lead.id,
        business: lead.business_name,
        messageId,
        errorCode,
        errorMessage
      })
    }
  } catch (error) {
    logger.error('Failed to handle message failure', { error, payload })
  }
}
