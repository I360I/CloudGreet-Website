import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { telynyx } from '../../../../lib/telynyx'
import { logger } from '../../../../lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      MessageSid,
      From,
      To,
      Body,
      MessageStatus,
      SmsSid,
      SmsStatus,
      SmsMessageSid,
      NumMedia,
      MediaContentType0,
      MediaUrl0,
      ApiVersion
    } = body

    logger.info('SMS webhook received', {
      messageSid: MessageSid || SmsMessageSid,
      from: From,
      to: To,
      body: Body,
      status: MessageStatus || SmsStatus,
      numMedia: NumMedia
    })

    // Handle incoming SMS
    if (Body) {
      const messageText = Body
      const fromNumber = From
      const toNumber = To

      // Get business info
      const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('phone_number', toNumber)
        .single()

      if (businessError) {
        logger.error('Business lookup error', { 
          error: businessError.message, 
          toNumber 
        })
        return NextResponse.json({ error: 'Business not found' }, { status: 404 })
      }

      // Log the SMS
      const { error: smsError } = await supabaseAdmin
        .from('sms_messages')
        .insert({
          from_number: fromNumber,
          to_number: toNumber,
          message: messageText,
          direction: 'inbound',
          business_id: business.id,
          status: 'received',
          created_at: new Date().toISOString()
        })

      if (smsError) {
        logger.error('SMS logging error', { 
          error: smsError.message, 
          fromNumber, 
          toNumber 
        })
      }

      // Forward SMS to personal phone if forwarding is enabled
      if (business.sms_forwarding_enabled && business.notification_phone) {
        try {
          const forwardResponse = await fetch('https://api.telnyx.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: toNumber,
              to: business.notification_phone,
              text: `Forwarded SMS from ${fromNumber}: ${messageText}`,
              type: 'SMS'
            })
          })

          if (forwardResponse.ok) {
            logger.info('SMS forwarded successfully', {
              from: fromNumber,
              to: business.notification_phone
            })
          } else {
            logger.error('SMS forwarding failed', {
              status: forwardResponse.status,
              statusText: forwardResponse.statusText
            })
          }
        } catch (error) {
          logger.error('SMS forwarding error', { 
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Process with AI if needed
      if (business.ai_agent_enabled) {
        try {
          const aiResponse = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are an AI assistant for ${business.business_name}. ${business.greeting_message}`
              },
              {
                role: 'user',
                content: messageText
              }
            ],
            max_tokens: 150,
            temperature: 0.7
          })

          const aiReply = aiResponse.choices[0].message.content

          // Send AI response
          const replyResponse = await fetch('https://api.telnyx.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: toNumber,
              to: fromNumber,
              text: aiReply,
              type: 'SMS'
            })
          })

          if (replyResponse.ok) {
            logger.info('AI response sent successfully', {
              from: fromNumber,
              to: toNumber
            })
          }
        } catch (error) {
          logger.error('AI processing error', { 
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('SMS webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
