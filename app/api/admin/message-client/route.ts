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
      if (!process.env.TELNYX_API_KEY || !process.env.TELNYX_PHONE_NUMBER) {
        return NextResponse.json({ 
          success: false,
          error: 'SMS service not configured' 
        }, { status: 503 })
      }

      try {
        const smsResponse = await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.TELNYX_PHONE_NUMBER,
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

    // Send Email via Resend
    if (type === 'email') {
      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ 
          success: false,
          error: 'Email service not configured' 
        }, { status: 503 })
      }

      if (!client.email) {
        return NextResponse.json({ 
          success: false,
          error: 'Client email not found' 
        }, { status: 400 })
      }

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'CloudGreet <noreply@cloudgreet.com>',
            to: [client.email],
            subject: `Message from CloudGreet`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <h1 style="color: #3B82F6; margin-top: 0;">Message from CloudGreet</h1>
                  <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6; margin: 20px 0;">
                    <p style="color: #4B5563; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
                  </div>
                  <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                    Best regards,<br>
                    CloudGreet Team<br>
                    <a href="https://cloudgreet.com" style="color: #3B82F6;">cloudgreet.com</a>
                  </p>
                </div>
                <div style="text-align: center; color: #9CA3AF; font-size: 12px; padding-top: 20px;">
                  <p style="margin: 0;">© 2025 CloudGreet. All rights reserved.</p>
                </div>
              </div>
            `
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text()
          throw new Error(`Resend error: ${errorData}`)
        }

        const emailResult = await emailResponse.json()

        // Log email in database
        const { data: emailLog } = await supabase
          .from('email_logs')
          .insert({
            business_id: clientId,
            recipient: client.email,
            subject: 'Message from CloudGreet',
            message: message,
            status: 'sent',
            email_id: emailResult.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        const emailResultData = {
          id: emailResult.id,
          clientId,
          clientName: client.business_name,
          email: client.email,
          message,
          type,
          status: 'sent',
          timestamp: new Date().toISOString()
        }

        logger.info('Admin email sent successfully', { clientId, emailId: emailResult.id })

        return NextResponse.json({ 
          success: true, 
          message: emailResultData
        })
      } catch (error) {
        logger.error('Failed to send email', { error, clientId })
        return NextResponse.json({ 
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send email'
        }, { status: 500 })
      }
    }

    // Unknown type
    return NextResponse.json({ 
      success: false,
      error: 'Invalid message type. Use "sms" or "email"'
    }, { status: 400 })
  } catch (error) {
    logger.error('Admin message client error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
