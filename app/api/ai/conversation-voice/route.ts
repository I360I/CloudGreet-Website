import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Voice-specific AI conversation (no JWT required - called from Telnyx webhook)
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const body = await request.json()
    const { 
      businessId,
      message, 
      conversationHistory = [], 
      callerName, 
      callerPhone,
      callId,
      callContext = 'inbound_call'
    } = body

    if (!businessId) {
      return NextResponse.json({
        success: false,
        message: 'Business ID required'
      }, { status: 400 })
    }

    // Get AI agent and business data
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single()

    if (agentError || !agent) {
      logger.error('Active AI agent not found for voice call', { businessId, error: agentError })
      return NextResponse.json({
        success: false,
        message: 'AI agent not configured. Please complete onboarding first.'
      }, { status: 404 })
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for voice call', { businessId, error: businessError })
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    // Build conversation context
    const config = agent.configuration || {}
    const services = config.services || business.services || ['General Services']
    const serviceAreas = config.service_areas || business.service_areas || ['Local Area']
    
    const systemPrompt = `You are ${agent.agent_name || 'Sarah'}, the ${config.personality || 'friendly'} AI receptionist for ${business.business_name}. You're having a natural phone conversation with ${callerName || 'a potential customer'}.

CRITICAL: You are NOT a chatbot. You are a REAL PERSON having a REAL CONVERSATION on the PHONE. Act human, use natural speech patterns, and show genuine interest.

BUSINESS CONTEXT:
- Company: ${business.business_name} (${config.business_type || business.business_type})
- Services: ${services.join(', ')}
- Service Areas: ${serviceAreas.join(', ')}
- Phone: ${business.phone_number}
- Address: ${business.address}

CALLER INFO:
- Name: ${callerName || 'Not provided yet'}
- Phone: ${callerPhone || 'Not provided'}
- Context: ${callContext}

YOUR PERSONALITY:
- Tone: ${config.personality || 'friendly'} and ${config.tone || 'professional'}
- Voice: ${config.voice || 'natural'}
- Style: Conversational, warm, genuinely helpful

CONVERSATION GOALS:
1. Greet warmly and ask how you can help
2. Listen carefully and understand their specific need
3. Ask clarifying questions naturally
4. Provide helpful information about services
5. Qualify the lead (property type, urgency, budget range)
6. Offer to schedule an appointment if appropriate
7. Get their contact info if you don't have it
8. Make them feel valued and confident in your service

BOOKING APPOINTMENTS:
- Ask about their preferred date/time
- Confirm their contact information
- Get service address
- Understand the scope of work
- When ready to book, respond with: "BOOK_APPOINTMENT: [details]"

HUMAN-LIKE BEHAVIORS:
- Use natural speech: "Oh, I can definitely help with that!"
- Show empathy: "I understand, that must be frustrating"
- Be enthusiastic: "Great! Let me get that scheduled for you"
- Use their name when provided
- Remember what they've told you
- Keep responses SHORT (2-3 sentences max for phone)

CUSTOM INSTRUCTIONS:
${config.custom_instructions || ''}

Remember: This is a PHONE CALL. Keep responses brief, natural, and conversational. You're a real person, not a robot.`

    // Build conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message }
    ]

    // Generate AI response with voice-optimized settings
    const completion = await openai.chat.completions.create({
      model: config.ai_model || 'gpt-4-turbo-preview',
      messages: messages as any,
      max_tokens: 100, // Shorter for phone - keep responses brief
      temperature: 0.85, // Slightly higher for more natural speech
      presence_penalty: 0.4, // Encourage variety in responses
      frequency_penalty: 0.3, // Reduce repetition
      top_p: 0.9,
      stop: ['\n\n', 'Customer:', 'Caller:', 'Human:', 'User:']
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, could you repeat that?'

    // Check if AI wants to book an appointment
    let appointmentBooked = false
    let appointmentDetails = null
    
    if (aiResponse.includes('BOOK_APPOINTMENT:')) {
      // Extract appointment details and book it
      try {
        const appointmentMatch = aiResponse.match(/BOOK_APPOINTMENT: (.+)/)
        if (appointmentMatch) {
          appointmentDetails = appointmentMatch[1]
          
          // Create appointment in database
          const { data: appointment, error: aptError } = await supabaseAdmin
            .from('appointments')
            .insert({
              business_id: businessId,
              customer_name: callerName || 'Unknown',
              customer_phone: callerPhone || 'Unknown',
              service_type: 'Phone Consultation',
              appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default to tomorrow
              scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              status: 'scheduled',
              notes: appointmentDetails,
              source: 'ai_voice_call',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (!aptError && appointment) {
            appointmentBooked = true
            
            // Charge per-booking fee automatically
            try {
              const { data: business } = await supabaseAdmin
                .from('businesses')
                .select('stripe_customer_id, subscription_status')
                .eq('id', businessId)
                .single()

              if (business?.stripe_customer_id && business.subscription_status === 'active') {
                // Create booking fee charge
                const bookingFee = parseInt(process.env.BOOKING_FEE || '50')
                
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/billing/per-booking`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.JWT_SECRET}` // Internal call
                  },
                  body: JSON.stringify({
                    appointmentId: appointment.id,
                    customerName: callerName || 'Unknown',
                    serviceType: 'Phone Consultation',
                    estimatedValue: 0
                  })
                }).catch(err => logger.error('Failed to charge booking fee', { error: err }))
              }
            } catch (billingError) {
              logger.error('Booking fee automation failed', { error: billingError })
              // Don't fail the appointment if billing fails
            }
            
            // Send notification to business owner
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'client_booking',
                message: `New appointment booked via AI: ${callerName} - ${appointmentDetails}`,
                businessId: businessId,
                priority: 'high'
              })
            }).catch(err => logger.error('Failed to send booking notification', { error: err }))
          }
        }
      } catch (bookingError) {
        logger.error('Failed to book appointment from AI', { error: bookingError, aiResponse })
      }
    }

    // Clean response (remove booking command if present)
    const cleanResponse = aiResponse.replace(/BOOK_APPOINTMENT: .+/, 'Perfect! I\'ve scheduled that appointment for you. You\'ll receive a confirmation shortly.')

    // Log conversation in database
    await supabaseAdmin
      .from('conversation_history')
      .insert({
        business_id: businessId,
        call_id: callId,
        caller_name: callerName,
        caller_phone: callerPhone,
        user_message: message,
        ai_response: cleanResponse,
        conversation_context: callContext,
        ai_model: config.ai_model || 'gpt-4-turbo-preview',
        appointment_booked: appointmentBooked,
        created_at: new Date().toISOString()
      })

    // Update call record if callId provided
    if (callId) {
      await supabaseAdmin
        .from('calls')
        .update({
          transcript: `User: ${message}\nAI: ${cleanResponse}`,
          updated_at: new Date().toISOString()
        })
        .eq('call_id', callId)
    }

    // Update agent performance metrics
    await supabaseAdmin
      .from('ai_agents')
      .update({
        performance_metrics: {
          ...agent.performance_metrics,
          total_conversations: (agent.performance_metrics?.total_conversations || 0) + 1,
          appointments_booked: (agent.performance_metrics?.appointments_booked || 0) + (appointmentBooked ? 1 : 0),
          last_conversation: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id)

    logger.info('Voice AI conversation completed', {
      requestId,
      businessId,
      callerName,
      callerPhone,
      callId,
      appointmentBooked,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      response: cleanResponse,
      appointmentBooked,
      conversationId: requestId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Voice AI conversation error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Return a graceful fallback response
    return NextResponse.json({
      success: true, // Return success so call doesn't drop
      response: "I apologize, I'm having a brief technical issue. Let me transfer you to someone who can help.",
      shouldTransfer: true
    })
  }
}
