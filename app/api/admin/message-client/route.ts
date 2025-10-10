import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, message, type = 'sms' } = body

    if (!clientId || !message) {
      return NextResponse.json({ error: 'Client ID and message are required' }, { status: 400 })
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('businesses')
      .select('business_name, phone_number, email')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Log the message in SMS logs table
    const { data: messageLog, error: logError } = await supabase
      .from('sms_messages')
      .insert({
        business_id: clientId,
        phone_number: client.phone_number,
        message: message,
        direction: 'outbound',
        status: 'sent',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      logger.warn('Failed to log message in database', { error: logError, clientId })
    }

    // Send SMS via Telnyx
    if (type === 'sms') {
      if (!process.env.TELYNX_API_KEY || !process.env.TELYNX_PHONE_NUMBER) {
        return NextResponse.json({ 
          success: false,
          error: 'SMS service not configured' 
        }, { status: 503 })
      }

      try {
        const smsResponse = await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.TELYNX_PHONE_NUMBER,
            to: client.phone_number,
            text: `${message}\n\nReply STOP to opt out; HELP for help.`,
            type: 'SMS'
          })
        })

        if (!smsResponse.ok) {
          const errorData = await smsResponse.text()
          throw new Error(`Telnyx error: ${errorData}`)
        }

        const smsResult = await smsResponse.json()

        // Update message log with Telnyx message ID
        if (messageLog?.id) {
          await supabase
            .from('sms_messages')
            .update({
              status: 'delivered',
              telnyx_message_id: smsResult.data.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', messageLog.id)
        }

        const messageResult = {
          id: smsResult.data.id,
          clientId,
          clientName: client.business_name,
          phoneNumber: client.phone_number,
          message,
          type,
          status: 'sent',
          timestamp: new Date().toISOString()
        }

        logger.info('Admin message sent successfully', { clientId, messageId: smsResult.data.id })

        return NextResponse.json({ 
          success: true, 
          message: messageResult
        })
      } catch (error) {
        logger.error('Failed to send SMS', { error, clientId })
        return NextResponse.json({ 
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send SMS'
        }, { status: 500 })
      }
    }

    // Email sending would go here
    return NextResponse.json({ 
      success: false,
      error: 'Email sending not yet implemented'
    }, { status: 501 })
  } catch (error) {
    // Console error removed for production
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
