import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { telynyx } from '@/lib/telnyx'
import { logger } from '../../../../lib/monitoring'
import { verifyTelynyxSignature } from '@/lib/webhook-verification'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    // Webhook signature verification for security
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')
    
    // Get raw body for verification
    const rawBody = await request.text()
    
    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyTelynyxSignature(rawBody, signature, timestamp)
      
      if (!isValid) {
        logger.error('Invalid Telnyx SMS webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const body = JSON.parse(rawBody)
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
              'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
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

      // Handle special SMS commands first
      const messageCommand = messageText.toLowerCase().trim()
      
      if (messageCommand === 'stop' || messageCommand === 'unsubscribe') {
        // Handle opt-out
        await supabaseAdmin
          .from('sms_opt_outs')
          .insert({
            phone_number: fromNumber,
            business_id: business.id,
            created_at: new Date().toISOString()
          })

        // Send STOP confirmation
        await fetch('https://api.telnyx.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: toNumber,
            to: fromNumber,
            text: `You have been unsubscribed from ${business.business_name}. You will not receive further texts. Text START to resubscribe.`,
            type: 'SMS'
          })
        })

        logger.info('STOP command processed', { from: fromNumber, businessId: business.id })
        return NextResponse.json({ success: true })
      }

      if (messageCommand === 'help') {
        // Send HELP response
        const helpText = `${business.business_name} - AI Receptionist

Services: ${business.services?.join(', ') || 'General services'}
Hours: ${business.business_hours ? 'Mon-Fri 9AM-5PM' : 'Call for hours'}
Phone: ${business.phone_number || toNumber}
${business.website ? `Web: ${business.website}` : ''}

Reply STOP to opt out.`

        await fetch('https://api.telnyx.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: toNumber,
            to: fromNumber,
            text: helpText,
            type: 'SMS'
          })
        })

        logger.info('HELP command processed', { from: fromNumber, businessId: business.id })
        return NextResponse.json({ success: true })
      }

      if (messageCommand === 'start' || messageCommand === 'unstop') {
        // Handle opt-in
        await supabaseAdmin
          .from('sms_opt_outs')
          .delete()
          .eq('phone_number', fromNumber)
          .eq('business_id', business.id)

        // Send START confirmation
        await fetch('https://api.telnyx.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: toNumber,
            to: fromNumber,
            text: `Welcome back! You are now resubscribed to ${business.business_name}. Reply STOP to opt out; HELP for help.`,
            type: 'SMS'
          })
        })

        logger.info('START command processed', { from: fromNumber, businessId: business.id })
        return NextResponse.json({ success: true })
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
              'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
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
