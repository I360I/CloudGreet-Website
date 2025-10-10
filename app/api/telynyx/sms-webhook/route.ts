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
      Direction
    } = body

    // Store SMS in database
    const { data: sms, error: smsError } = await supabaseAdmin
      .from('sms_messages')
      .insert({
        message_id: MessageSid,
        from_number: From,
        to_number: To,
        message_text: Body,
        status: MessageStatus,
        direction: Direction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (smsError) {
      logger.error('Error storing SMS log', { 
        error: smsError, 
        smsId: MessageSid,
        from: From,
        to: To
      })
    }

    // Only process inbound SMS
    if (Direction !== 'inbound') {
      return NextResponse.json({ success: true })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('phone_number', To)
      .single()

    if (businessError) {
      return NextResponse.json({ success: true })
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
            from: To, // Business phone
            to: business.notification_phone, // Personal phone
            text: `[CloudGreet SMS] From: ${From}\nMessage: ${Body}`,
            type: 'SMS'
          })
        })

        if (forwardResponse.ok) {
          logger.info('SMS forwarded successfully to personal phone', {
            businessId: business.id,
            from: From,
            to: business.notification_phone
          })
        } else {
          logger.error('Failed to forward SMS', { 
            error: new Error(`Status: ${forwardResponse.status}`), 
            businessId: business.id,
            status: forwardResponse.status
          })
        }
      } catch (error) {
        logger.error('Error forwarding SMS', { 
          error: error instanceof Error ? error.message : 'Unknown error', 
          businessId: business.id,
          from: From,
          to: business.notification_phone
        })
      }
    }

    // Get AI agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .single()

    if (agentError) {
      return NextResponse.json({ success: true })
    }

    // Handle special SMS commands
    const message = Body.toLowerCase().trim()
    
    if (message === 'stop' || message === 'unsubscribe') {
      // Handle opt-out
      await supabaseAdmin
        .from('sms_opt_outs')
        .insert({
          phone_number: From,
          business_id: business.id,
          created_at: new Date().toISOString()
        })

      // Send STOP confirmation
      try {
        await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: To,
            to: From,
            text: `You have been unsubscribed from ${business.business_name} SMS messages. You will not receive further texts. Text START to resubscribe.`,
            type: 'SMS'
          })
        })

        logger.info('STOP command processed', { from: From, businessId: business.id })
      } catch (error) {
        logger.error('Failed to send STOP confirmation', { error, from: From })
      }

      return NextResponse.json({ success: true })
    }

    if (message === 'help') {
      // Send HELP response
      try {
        const helpText = `${business.business_name} - AI Receptionist
        
Services: ${business.services?.join(', ') || 'General services'}
Hours: Mon-Fri 9AM-5PM
Call: ${business.phone_number || To}
Website: ${business.website || 'N/A'}

Reply STOP to opt out.`

        await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: To,
            to: From,
            text: helpText,
            type: 'SMS'
          })
        })

        logger.info('HELP command processed', { from: From, businessId: business.id })
      } catch (error) {
        logger.error('Failed to send HELP response', { error, from: From })
      }

      return NextResponse.json({ success: true })
    }

    if (message === 'start' || message === 'unstop') {
      // Handle opt-in (remove from opt-out list)
      await supabaseAdmin
        .from('sms_opt_outs')
        .delete()
        .eq('phone_number', From)
        .eq('business_id', business.id)

      // Send START confirmation
      try {
        await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: To,
            to: From,
            text: `You have been resubscribed to ${business.business_name} SMS messages. Reply STOP to opt out; HELP for help.`,
            type: 'SMS'
          })
        })

        logger.info('START command processed', { from: From, businessId: business.id })
      } catch (error) {
        logger.error('Failed to send START confirmation', { error, from: From })
      }

      return NextResponse.json({ success: true })
    }

    // Get conversation history
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('chat_sessions')
      .select('messages')
      .eq('phone_number', From)
      .eq('business_id', business.id)
      .single()

    let messages = conversation?.messages || []
    
    // Add user message
    messages.push({
      role: 'user',
      content: Body,
      timestamp: new Date().toISOString()
    })

    // Generate AI response
    const systemPrompt = `You are an AI receptionist for ${business.business_name}, a ${business.business_type} business.

Business Information:
- Name: ${business.business_name}
- Type: ${business.business_type}
- Services: ${business.services?.join(', ') || 'General services'}
- Greeting: ${agent.greeting_message || 'How can I help you today?'}
- Tone: ${agent.tone || 'Professional and friendly'}

Your responsibilities:
1. Answer questions about services and pricing
2. Schedule appointments when requested
3. Take messages for the business owner
4. Provide contact information
5. Be helpful, professional, and friendly

Keep SMS responses concise (under 160 characters). Don't ask multiple questions at once.
If they want to schedule an appointment, ask for their name and preferred date/time.

End all messages with: "Reply STOP to opt out; HELP for help."`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10) // Keep last 10 messages for context
      ],
      max_tokens: 100,
      temperature: 0.7
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Thank you for your message. We\'ll get back to you soon. Reply STOP to opt out; HELP for help.'

    // Add AI response to messages
    messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    })

    // Save conversation
    await supabaseAdmin
      .from('chat_sessions')
      .upsert({
        phone_number: From,
        business_id: business.id,
        messages: messages,
        updated_at: new Date().toISOString()
      })

    // Send AI response
    // SMS sending would be implemented here
    // AI response would be sent via SMS

    return NextResponse.json({ success: true })

  } catch (error) {
    // Log error for debugging but don't expose to client
    return NextResponse.json({ success: true })
  }
}
