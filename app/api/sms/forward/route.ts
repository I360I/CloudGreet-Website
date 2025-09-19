import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

// Your personal phone number for notifications
const PERSONAL_PHONE = '+17372960092'
const BUSINESS_PHONE = '+17372448305'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { from, to, text, message_id } = body

    // Log the incoming SMS
    logger.info('SMS received', {
      from,
      to,
      text,
      message_id
    })

    // Store SMS in database
    const { data: smsLog, error: smsError } = await supabaseAdmin
      .from('sms_logs')
      .insert({
        from_number: from,
        to_number: to,
        message_text: text,
        message_id: message_id,
        direction: 'inbound',
        status: 'received',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (smsError) {
      logger.error('Error storing SMS log', smsError, { body })
    }

    // Forward SMS to your personal phone
    try {
      const forwardResponse = await fetch('https://api.telynx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: BUSINESS_PHONE,
          to: PERSONAL_PHONE,
          text: `[CloudGreet SMS] From: ${from}\nMessage: ${text}`,
          type: 'SMS'
        })
      })

      if (forwardResponse.ok) {
        logger.info('SMS forwarded successfully', {
          from: BUSINESS_PHONE,
          to: PERSONAL_PHONE,
          original_from: from,
          original_text: text
        })
      } else {
        logger.error('Failed to forward SMS', new Error('Telynyx API error'), {
          status: forwardResponse.status,
          statusText: forwardResponse.statusText
        })
      }
    } catch (error) {
      logger.error('Error forwarding SMS', error as Error, { body })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('SMS forward error', error as Error, { endpoint: 'sms/forward' })
    return NextResponse.json({ error: 'Failed to process SMS' }, { status: 500 })
  }
}
