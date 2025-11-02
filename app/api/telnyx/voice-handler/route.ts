import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'
import { AI_CONFIG } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Voice Handler - Processes ongoing conversation during calls
 * 
 * Features:
 * - Maintains conversation history for context
 * - Detects booking intent using OpenAI function calling
 * - Automatically creates appointments when booking detected
 * - Stores all messages in conversation_history table
 */

export async function POST(request: NextRequest) {
  const timeoutId = setTimeout(() => {
    logger.error('Voice handler timeout - returning default response')
  }, AI_CONFIG.CONVERSATION_TIMEOUT_MS)
  
  try {
    const body = await request.json()
    const { 
      call_control_id,
      call_leg_id, 
      from,
      to,
      SpeechResult,
      Digits
    } = body

    const callId = call_control_id || call_leg_id
    const userSpeech = SpeechResult || body.speech?.text || body.transcription_text

    logger.info('Voice handler called', {
      callId,
      from,
      to,
      userSpeech: userSpeech?.substring(0, 50)
    })

    // Get business info for AI context
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('phone_number', to)
      .single()

    if (businessError || !business) {
      logger.error('Business not found', { to, error: businessError?.message })
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        instructions: [
          {
            instruction: 'say',
            text: 'I apologize, but I cannot find your business information. Please try again later.',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    const agent = Array.isArray(business.ai_agents) ? business.ai_agents[0] : business.ai_agents
    const businessId = business.id

    // Load conversation history for context
    const { data: history } = await supabaseAdmin
      .from('conversation_history')
      .select('user_message, ai_response')
      .eq('call_id', callId)
      .order('created_at', { ascending: true })
      .catch(() => ({ data: [] })) // If table doesn't exist or error, use empty array

    // Build system prompt with business context
    const services = business.services || agent?.configuration?.services || ['General Services']
    const businessHours = business.business_hours || agent?.configuration?.hours || 'Monday-Friday 9AM-5PM'
    
    const systemPrompt = `You are a professional AI receptionist for ${business.business_name}, a ${business.business_type || 'service'} business.

Business Information:
- Services: ${Array.isArray(services) ? services.join(', ') : services}
- Business Hours: ${typeof businessHours === 'string' ? businessHours : JSON.stringify(businessHours)}
- Phone: ${business.phone_number}

Your role:
1. Answer questions about services professionally
2. Qualify leads by understanding their needs
3. Book appointments when requested
4. Keep responses brief (15-20 words) for phone conversations

When someone wants to book an appointment, extract:
- Their name
- Phone number (if not provided, use caller's number: ${from})
- Service type they need
- Preferred date and time
- Service address (if applicable)

Important: Be natural, conversational, and helpful. Never mention you're an AI.`

    // Build messages array with conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ]

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach((entry: any) => {
        if (entry.user_message) {
          messages.push({ role: 'user', content: entry.user_message })
        }
        if (entry.ai_response) {
          messages.push({ role: 'assistant', content: entry.ai_response })
        }
      })
    }

    // Add current user message
    if (userSpeech) {
      messages.push({ role: 'user', content: userSpeech })
      
      // Store user message in conversation history
      await supabaseAdmin
        .from('conversation_history')
        .insert({
          business_id: businessId,
          call_id: callId,
          user_message: userSpeech,
          created_at: new Date().toISOString()
        })
        .catch(error => {
          logger.warn('Failed to store user message', { callId, error: error.message })
        })
    }

    // Use OpenAI with function calling for booking detection
    let aiResponse = 'Thank you for calling! How can I help you today?'
    let bookingDetected = false
    let bookingData: any = null

    if (userSpeech) {
      try {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o', // Use gpt-4o for better function calling
          messages: messages as any,
          max_tokens: 150,
          temperature: 0.7,
          tools: [
            {
              type: 'function',
              function: {
                name: 'detect_booking_intent',
                description: 'Detect if the caller wants to book an appointment and extract booking details',
                parameters: {
                  type: 'object',
                  properties: {
                    wants_to_book: {
                      type: 'boolean',
                      description: 'Whether the caller wants to schedule an appointment'
                    },
                    customer_name: {
                      type: 'string',
                      description: 'Customer full name if mentioned'
                    },
                    service_type: {
                      type: 'string',
                      description: 'Type of service they need'
                    },
                    preferred_date: {
                      type: 'string',
                      description: 'Preferred appointment date (YYYY-MM-DD format)'
                    },
                    preferred_time: {
                      type: 'string',
                      description: 'Preferred appointment time (HH:MM format)'
                    },
                    address: {
                      type: 'string',
                      description: 'Service address if mentioned'
                    },
                    notes: {
                      type: 'string',
                      description: 'Any additional notes or requirements'
                    }
                  },
                  required: ['wants_to_book']
                }
              }
            }
          ],
          tool_choice: 'auto'
        })

        const message = completion.choices[0]?.message
        aiResponse = message?.content || aiResponse

        // Check for booking intent in tool calls
        if (message?.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            if (toolCall.function.name === 'detect_booking_intent') {
              try {
                const args = JSON.parse(toolCall.function.arguments)
                if (args.wants_to_book && (args.customer_name || args.service_type)) {
                  bookingDetected = true
                  bookingData = {
                    customerName: args.customer_name || 'Customer',
                    customerPhone: from,
                    serviceType: args.service_type || (Array.isArray(services) ? services[0] : services),
                    preferredDate: args.preferred_date,
                    preferredTime: args.preferred_time,
                    address: args.address || '',
                    notes: args.notes || ''
                  }

                  // Call booking API
                  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
                  try {
                    const bookingResult = await fetch(`${baseUrl}/api/appointments/ai-book`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        businessId,
                        callId,
                        customerName: bookingData.customerName,
                        customerPhone: bookingData.customerPhone,
                        customerAddress: bookingData.address,
                        serviceType: bookingData.serviceType,
                        scheduledDate: bookingData.preferredDate 
                          ? `${bookingData.preferredDate}T${bookingData.preferredTime || '10:00'}:00`
                          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default to tomorrow
                        scheduledTime: bookingData.preferredTime || '10:00',
                        notes: bookingData.notes,
                        conversationTranscript: messages.map(m => `${m.role}: ${m.content}`).join('\n')
                      }),
                      signal: AbortSignal.timeout(10000) // 10 second timeout
                    })

                    if (bookingResult.ok) {
                      const booking = await bookingResult.json()
                      logger.info('Appointment booked successfully via voice handler', {
                        callId,
                        appointmentId: booking.appointment?.id,
                        businessId
                      })
                      aiResponse = `Perfect! I've scheduled your ${bookingData.serviceType} appointment${bookingData.preferredDate ? ` for ${bookingData.preferredDate}` : ''}. You'll receive a confirmation text shortly. Is there anything else I can help you with?`
                    } else {
                      const errorText = await bookingResult.text()
                      let errorData
                      try {
                        errorData = JSON.parse(errorText)
                      } catch {
                        errorData = { message: errorText }
                      }
                      logger.error('Booking creation failed', { 
                        callId, 
                        status: bookingResult.status,
                        error: errorData 
                      })
                      aiResponse = `I'd be happy to book that for you! Let me get you in touch with our scheduling team. They'll call you back shortly.`
                    }
                  } catch (fetchError) {
                    // Handle timeout and network errors
                    const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error'
                    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('aborted')
                    
                    logger.error('Failed to call booking API', { 
                      callId, 
                      error: errorMessage,
                      isTimeout 
                    })
                    
                    aiResponse = isTimeout
                      ? `I'd be happy to book that appointment for you. Our system is a bit slow right now, but our team will call you back shortly to finalize the details.`
                      : `I'd be happy to book that appointment for you. Our team will call you back to finalize the details.`
                  }
                }
              } catch (parseError) {
                logger.error('Failed to parse booking intent', { callId, error: parseError })
              }
            }
          }
        }

      } catch (aiError) {
        logger.error('AI conversation failed', { 
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
          callId 
        })
        return NextResponse.json({
          call_id: callId,
          status: 'error',
          instructions: [
            {
              instruction: 'say',
              text: 'I apologize, but I\\'m experiencing technical difficulties. Please try again later.',
              voice: 'alloy'
            },
            {
              instruction: 'hangup'
            }
          ]
        }, { status: 500 })
      }
    }

    // Store AI response in conversation history
    if (aiResponse) {
      await supabaseAdmin
        .from('conversation_history')
        .insert({
          business_id: businessId,
          call_id: callId,
          ai_response: aiResponse,
          intent: bookingDetected ? 'booking' : 'general',
          created_at: new Date().toISOString()
        })
        .catch(error => {
          logger.warn('Failed to store AI response', { callId, error: error.message })
        })
    }

    // Check for conversation end keywords
    const endKeywords = ['goodbye', 'bye', 'thank you', 'that\\'s all', 'nothing else', 'done']
    const isComplete = endKeywords.some(keyword => userSpeech?.toLowerCase().includes(keyword))

    if (isComplete) {
      return NextResponse.json({
        call_id: callId,
        status: 'complete',
        instructions: [
          {
            instruction: 'say',
            text: aiResponse,
            voice: agent?.voice || business.voice || 'alloy'
          },
          {
            instruction: 'say',
            text: 'Thank you for calling! Have a great day!',
            voice: agent?.voice || business.voice || 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    // Continue conversation
    return NextResponse.json({
      call_id: callId,
      status: 'active',
      instructions: [
        {
          instruction: 'say',
          text: aiResponse,
          voice: agent?.voice || business.voice || 'alloy'
        },
        {
          instruction: 'gather',
          input: ['speech'],
          timeout: 10,
          speech_timeout: 'auto',
          speech_model: 'default',
          action_on_empty_result: true,
          finish_on_key: '#',
          action: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/telnyx/voice-handler`
        }
      ]
    })

  } catch (error) {
    logger.error('Voice handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'I apologize, but I\\'m having trouble processing your request. Let me have someone call you back shortly.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
