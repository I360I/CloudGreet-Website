import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyTelnyxSignature } from '@/lib/telnyx'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // WEBHOOK SECURITY: Verify Telnyx signature
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')
    const rawBody = await request.text()
    
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyTelnyxSignature(rawBody, signature, timestamp)
      if (!isValid) {
        logger.error('Invalid Telnyx voicemail webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
    
    const body = JSON.parse(rawBody)
    const { 
      call_control_id,
      call_leg_id,
      call_session_id,
      from,
      to,
      recording_url, 
      duration,
      direction
    } = body

    const callId = call_control_id || call_leg_id || body.call_id
    const callerPhone = from || body.from_number
    const businessPhone = to || body.to_number

    logger.info('Voicemail handler called', {
      callId,
      callerPhone,
      businessPhone,
      recording_url,
      duration
    })

    // Get business by phone number
    const { data: phoneRecord, error: phoneError } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('*, businesses(*)')
      .eq('number', businessPhone)
      .eq('status', 'assigned')
      .single()

    const business = phoneRecord?.businesses

    if (phoneError || !business) {
      logger.error('Business not found for voicemail', { 
        businessPhone,
        error: phoneError 
      })
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        message: 'Business not found'
      }, { status: 404 })
    }

    // Update or create call record with voicemail status
    const { data: existingCall } = await supabaseAdmin
      .from('calls')
      .select('id')
      .eq('call_id', callId)
      .single()

    if (existingCall) {
      // Update existing call
      await supabaseAdmin
        .from('calls')
        .update({
          recording_url: recording_url || null,
          duration: duration || 0,
          status: 'voicemail',
          outcome: 'voicemail_left',
          updated_at: new Date().toISOString()
        })
        .eq('call_id', callId)
    } else {
      // Create new call record
      await supabaseAdmin
        .from('calls')
        .insert({
          business_id: business.id,
          call_id: callId,
          from_number: callerPhone,
          to_number: businessPhone,
          direction: direction || 'inbound',
          recording_url: recording_url || null,
          duration: duration || 0,
          status: 'voicemail',
          outcome: 'voicemail_left',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    // Send SMS recovery message to caller
    if (callerPhone) {
      try {
        const recoveryMessage = `Hi! Thanks for calling ${business.business_name}. We received your voicemail. Text us back anytime or visit ${process.env.NEXT_PUBLIC_BASE_URL || 'our website'} to schedule. Reply STOP to opt out.`

        const smsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: callerPhone,
            from: businessPhone,
            message: recoveryMessage,
            businessId: business.id,
            type: 'missed_call_recovery'
          })
        })

        if (smsResponse.ok) {
          logger.info('Missed call SMS recovery sent', {
            callId,
            callerPhone,
            businessId: business.id
          })

          // Update call with SMS sent flag
          await supabaseAdmin
            .from('calls')
            .update({
              sms_follow_up_sent: true,
              updated_at: new Date().toISOString()
            })
            .eq('call_id', callId)
        } else {
          logger.warn('Failed to send recovery SMS', {
            callId,
            status: smsResponse.status
          })
        }
      } catch (smsError) {
        logger.error('Error sending recovery SMS', {
          error: smsError instanceof Error ? smsError.message : 'Unknown error',
          callId
        })
      }
    }

    // Notify business owner about voicemail
    try {
      if (business.notification_phone || business.phone) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: business.notification_phone || business.phone,
            from: businessPhone,
            message: `New voicemail from ${callerPhone}${duration ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)` : ''}. Recovery SMS sent automatically. Check dashboard for details.`,
            businessId: business.id,
            type: 'voicemail_notification'
          })
        })
      }
    } catch (notificationError) {
      logger.warn('Business notification failed', { 
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
      })
    }

    return NextResponse.json({
      call_id: callId,
      status: 'success',
      message: 'Voicemail processed and recovery SMS sent',
      recovery_sent: !!callerPhone
    })

  } catch (error) {
    logger.error('Voicemail handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: 'telnyx/voicemail-handler'
    })
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      message: 'Failed to process voicemail'
    }, { status: 500 })
  }
}
