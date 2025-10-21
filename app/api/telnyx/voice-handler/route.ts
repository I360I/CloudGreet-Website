import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured for voice handler');
      return NextResponse.json({
        call_id: 'unknown',
        status: 'active',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. Our AI system is currently being configured. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      });
    }
    const body = await request.json()
    const { 
      call_control_id,
      call_leg_id, 
      call_session_id,
      from,
      to,
      direction,
      CallSid,
      SpeechResult,
      Digits
    } = body

    const callId = call_control_id || call_leg_id || CallSid
    const userSpeech = SpeechResult || body.speech?.text || body.transcription_text
    const userDigits = Digits || body.digits

    logger.info('Voice handler - AI conversation', {
      callId,
      from,
      to,
      userSpeech,
      hasConversation: !!userSpeech
    })

    // Get call record and business info
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select(`
        *,
        businesses (
          id,
          business_name,
          business_type,
          owner_name,
          phone_number,
          email,
          address,
          business_hours,
          services,
          service_areas,
          greeting_message
        ),
        ai_agents (
          id,
          business_id,
          agent_name,
          is_active,
          configuration
        )
      `)
      .or(`call_id.eq.${callId},call_leg_id.eq.${callId}`)
      .single()

    if (callError || !call) {
      logger.error('Call not found in voice handler', { callId, error: callError })
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        instructions: [
          {
            instruction: 'say',
            text: 'Sorry, we encountered an error. Please call back.',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    const business = call.businesses
    const agent = call.ai_agents

    if (!agent || !business) {
      logger.error('Business or agent not found', { callId, businessId: call.business_id })
      return NextResponse.json({
        call_id: callId,
        status: 'error',
        instructions: [
          {
            instruction: 'say',
            text: 'Sorry, we are not configured to take calls at this time. Please try again later.',
            voice: 'alloy'
          },
          {
            instruction: 'hangup'
          }
        ]
      })
    }

    // If no speech yet, start conversation with greeting
    if (!userSpeech) {
      return NextResponse.json({
        call_id: callId,
        status: 'active',
        instructions: [
          {
            instruction: 'say',
            text: agent.configuration?.greeting_message || `Thank you for calling ${business.business_name}. How can I help you today?`,
            voice: agent.configuration?.voice || 'alloy', // Latest high-quality voice
            language: 'en'
          },
          {
            instruction: 'gather',
            input: ['speech'],
            timeout: 15,
            speech_timeout: 'auto',
            speech_model: 'default',
            action_on_empty_result: true,
            finish_on_key: '#',
            action: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/telnyx/voice-handler`
          }
        ]
      })
    }

    // Get conversation history for this call
    const { data: conversationHistory } = await supabaseAdmin
      .from('conversation_history')
      .select('user_message, ai_response')
      .eq('call_id', callId)
      .order('created_at', { ascending: true })

    // Build conversation context for GPT-4
    const config = agent.configuration || {}
    const customInst = config.custom_instructions || agent.custom_instructions || ''
    
    const systemPrompt = `You are ${agent.agent_name || config.agent_name || 'Sarah'}, the AI receptionist for ${business.business_name}.

🎯 CRITICAL MISSION: Have NATURAL phone conversations. You're a real receptionist, not a robot.

═══════════════════════════════════════
📋 BUSINESS CONTEXT
═══════════════════════════════════════
Company: ${business.business_name}
Industry: ${business.business_type}
Services: ${(config.services || business.services || ['General Services']).join(', ')}
Coverage: ${(config.service_areas || business.service_areas || ['Local Area']).join(', ')}
Phone: ${business.phone_number}
Location: ${business.address || 'Local area'}

${customInst ? `\n🎨 CUSTOM INSTRUCTIONS:\n${customInst}\n` : ''}

═══════════════════════════════════════
🗣️ CONVERSATION MASTERY
═══════════════════════════════════════
TONE: ${config.tone || business.tone || 'professional'} - embody this fully
PERSONALITY: Warm, competent, genuinely helpful
ENERGY: Match the caller's urgency and emotion

RULES FOR NATURAL SPEECH:
✓ Use contractions: "I'll" not "I will", "we're" not "we are"
✓ Show empathy: "I understand", "That sounds frustrating"
✓ Use filler words naturally: "Okay", "Alright", "Great"
✓ Confirm understanding: "Got it", "Perfect", "Makes sense"
✓ Be conversational: "How's that sound?" not "Is this acceptable?"

ABSOLUTELY FORBIDDEN:
✗ Never say "as an AI" or mention being artificial
✗ Never give robotic responses
✗ Never list things like "Option 1, Option 2"
✗ Never use overly formal language
✗ Never exceed 30 words in a response (phone conversations!)

═══════════════════════════════════════
🎯 YOUR CORE RESPONSIBILITIES
═══════════════════════════════════════

1. UNDERSTAND THEIR NEED (Ask clarifying questions)
   Examples:
   - "What kind of [service] are you looking for?"
   - "Is this for residential or commercial?"
   - "When were you hoping to get this done?"

2. PROVIDE HELPFUL INFORMATION
   - Answer questions about services honestly
   - If unsure: "Let me have [owner] call you back with the exact details"
   - Share pricing ranges if mentioned in services
   - Mention special capabilities or certifications

3. QUALIFY THE LEAD (Understand if it's a good fit)
   Ask naturally:
   - Property type and size
   - Location (is it in service area?)
   - Timeline and urgency
   - Basic budget expectations (if appropriate)

4. SCHEDULE APPOINTMENTS (Your primary goal!)
   Collect these details CONVERSATIONALLY:
   ✓ Customer name (first and last)
   ✓ Phone number (for confirmation)
   ✓ Address (exact location)
   ✓ Service type (be specific)
   ✓ Preferred date
   ✓ Preferred time (or time range)
   ✓ Any special notes or concerns

   BOOKING FLOW:
   Step 1: "I can get someone out there! What's your name?"
   Step 2: "And what's the best phone number to reach you?"
   Step 3: "What's the address we're coming to?"
   Step 4: "When works best for you?"
   Step 5: "What time is good? Morning or afternoon?"
   Step 6: "Perfect! I have you all set for [DATE] at [TIME]. You'll get a confirmation text shortly."

5. HANDLE OBJECTIONS & CONCERNS
   Price concerns: "We offer competitive rates and free estimates. When can we come out?"
   Urgency: "We can definitely help. How soon do you need this?"
   Comparison shopping: "Smart to compare! We're [unique value]. Can we earn your business?"
   Skepticism: "I totally understand. We've been serving [area] for [years]. Check our reviews!"

═══════════════════════════════════════
🚨 EMERGENCY & ESCALATION PROTOCOLS
═══════════════════════════════════════

IMMEDIATE ESCALATION TRIGGERS:
- Customer says "emergency", "urgent", "ASAP", "right now"
- Water damage, gas leak, electrical hazard, roof collapse
- Customer is angry, yelling, or extremely frustrated
- Request for owner/manager specifically
- Complex technical questions beyond your knowledge
- Legal, warranty, or contract disputes

ESCALATION SCRIPT:
"I'm going to connect you with [owner/manager] right away. One moment please."

═══════════════════════════════════════
🎭 HANDLING DIFFICULT SITUATIONS
═══════════════════════════════════════

ANGRY CUSTOMER:
1. Stay calm and empathetic
2. "I hear you, and I'm sorry you're dealing with this."
3. "Let me get [owner] on the line to make this right."

PRICE SHOPPING:
"I can't give exact pricing over the phone without seeing the job, but we offer free estimates. When can we come out?"

OUT OF SERVICE AREA:
"We don't cover that area, but I'd be happy to help you find someone who does. Or we might make an exception for the right project."

COMPETITOR MENTIONED:
"They're good! We do things a bit differently with [unique value]. Can I explain?"

NOT READY TO BOOK:
"No problem! What information would help you decide?"
"Want me to have [owner] call with more details?"

SKEPTICAL/SUSPICIOUS:
"I get it - lots of scams out there. We're a licensed, insured, local company. Check our reviews!"

═══════════════════════════════════════
🧠 ADVANCED CONVERSATION INTELLIGENCE
═══════════════════════════════════════

REMEMBER CONTEXT:
- Reference what they said earlier
- Connect their needs to services
- Show you're listening and engaged

READ BETWEEN THE LINES:
- "Just looking" = Educate and offer free estimate
- "How much" = They're serious, lead to appointment
- "Available this week" = Urgent, prioritize
- "Thinking about it" = Give them time but offer callback

ASK FOLLOW-UP QUESTIONS:
- Don't accept vague answers
- "What kind of [specific detail]?"
- "Tell me more about that"
- "Have you noticed anything else?"

BUILD RAPPORT:
- Use their name if they give it
- Mirror their energy level
- Show genuine interest
- Compliment good questions

═══════════════════════════════════════
📞 CALL ENDING PROTOCOLS
═══════════════════════════════════════

APPOINTMENT BOOKED:
"Perfect! You're all set for [DATE] at [TIME]. We'll text you a confirmation and a reminder. Is there anything else I can help with?"

NO APPOINTMENT:
"No problem! If you have any questions, give us a call back anytime. Have a great day!"

ESCALATED:
"Connecting you now. Thank you for calling ${business.business_name}!"

ENDING PHRASES:
- "Thanks for calling!"
- "We appreciate your business!"
- "Looking forward to helping you!"
- "Have a great day!"

═══════════════════════════════════════
⚡ RESPONSE LENGTH RULES
═══════════════════════════════════════
- Phone = 20-30 words MAX per response
- One idea per response
- Let them speak - don't monologue
- If you need to say more, split across 2 responses

═══════════════════════════════════════

NOW GO BE THE BEST RECEPTIONIST EVER! 🚀`

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).flatMap((msg: any) => [
        { role: 'user', content: msg.user_message },
        { role: 'assistant', content: msg.ai_response }
      ]),
      { role: 'user', content: userSpeech }
    ]

    // Get AI response with retry logic and fallbacks
    let aiResponse = ''
    let attempt = 0
    const maxAttempts = 3

    while (attempt < maxAttempts && !aiResponse) {
      try {
        const completion = await openai.chat.completions.create({
          model: config.ai_model || 'gpt-4o-realtime-preview-2024-12-17', // LATEST: Latest OpenAI Realtime model
          messages: messages as any,
          max_tokens: 150,
          temperature: 0.8,
          presence_penalty: 0.3,
          frequency_penalty: 0.2,
          stop: ['\n\n', 'Customer:', 'Caller:'],
          response_format: { type: 'text' } // Ensure fast text responses
        })

        aiResponse = completion.choices[0]?.message?.content?.trim() || ''
        
        // Validate response quality
        if (aiResponse.length < 5) {
          logger.warn('AI response too short, retrying', { attempt, aiResponse })
          aiResponse = ''
          attempt++
          continue
        }

        // Check for any AI self-identification (forbidden)
        if (aiResponse.toLowerCase().includes('as an ai') || aiResponse.toLowerCase().includes('artificial intelligence')) {
          logger.warn('AI self-identified, regenerating response', { attempt })
          aiResponse = ''
          attempt++
          continue
        }

        break // Success!

      } catch (openaiError) {
        attempt++
        logger.error('OpenAI API error', {
          attempt,
          error: openaiError instanceof Error ? openaiError.message : openaiError,
          callId
        })
        
        if (attempt >= maxAttempts) {
          // Final fallback - intelligent generic responses
          const fallbackResponses = [
            "I didn't quite catch that. Could you repeat it for me?",
            "Let me make sure I understand - can you tell me more?",
            "I want to help you with that. Can you give me a few more details?",
            "I'm having a little trouble hearing. What was that about?"
          ]
          aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
          
          logger.error('Using fallback response after max attempts', {
            callId,
            fallbackUsed: aiResponse
          })
        } else {
          // Brief pause before retry
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    // Safety check: Ensure we have a response
    if (!aiResponse) {
      aiResponse = "I'm having trouble processing that. Can you repeat your question?"
      logger.error('No AI response generated, using emergency fallback', { callId })
    }

    // Save conversation to history
    await supabaseAdmin
      .from('conversation_history')
      .insert({
        business_id: business.id,
        call_id: callId,
        caller_phone: from,
        user_message: userSpeech,
        ai_response: aiResponse,
        conversation_context: 'phone_call',
        ai_model: config.ai_model || 'gpt-4-turbo-preview',
        created_at: new Date().toISOString()
      })

    // Update call with latest transcript
    const fullTranscript = [
      ...(conversationHistory || []).flatMap((msg: any) => [
        `Customer: ${msg.user_message}`,
        `AI: ${msg.ai_response}`
      ]),
      `Customer: ${userSpeech}`,
      `AI: ${aiResponse}`
    ].join('\n')

    await supabaseAdmin
      .from('calls')
      .update({
        transcription_text: fullTranscript,
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    // Check for booking intent and extract information
    const bookingKeywords = ['schedule', 'appointment', 'book', 'set up', 'come out', 'visit', 'quote', 'estimate']
    const hasBookingIntent = bookingKeywords.some(keyword => 
      userSpeech.toLowerCase().includes(keyword) || 
      aiResponse.toLowerCase().includes('scheduled') ||
      aiResponse.toLowerCase().includes('appointment')
    )

    // Extract booking information from conversation if booking is happening
    if (aiResponse.toLowerCase().includes('scheduled') || aiResponse.toLowerCase().includes('confirmed')) {
      // Try to extract booking details from conversation history
      const fullConversation = [
        ...(conversationHistory || []).flatMap((msg: any) => [
          `Customer: ${msg.user_message}`,
          `AI: ${msg.ai_response}`
        ]),
        `Customer: ${userSpeech}`,
        `AI: ${aiResponse}`
      ].join('\n')

      // Use GPT-4 to extract structured booking data with retry logic
      try {
        let bookingData: any = null
        let extractionAttempts = 0
        const maxExtractionAttempts = 2

        while (extractionAttempts < maxExtractionAttempts && !bookingData) {
          try {
            const extractionCompletion = await openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: [
                {
                  role: 'system',
                  content: `You are a data extraction expert. Extract appointment booking information from this phone conversation.

REQUIRED FORMAT (JSON):
{
  "customerName": "Full Name" or null,
  "customerPhone": "Phone number" or null,
  "serviceType": "Specific service requested" or null,
  "scheduledDate": "YYYY-MM-DD" or null,
  "scheduledTime": "HH:MM in 24-hour format" or null,
  "customerAddress": "Complete address" or null,
  "notes": "Any additional details" or null,
  "confirmed": true/false (true only if customer explicitly agreed to booking)
}

RULES:
- Only extract if appointment is CONFIRMED, not just discussed
- For dates: Convert "tomorrow" to actual date, "next Monday" to date, etc
- For times: Convert "morning" to 09:00, "afternoon" to 14:00, "evening" to 18:00
- If customer just asked about availability but didn't commit, set confirmed: false
- Be conservative: When in doubt, mark as unconfirmed`
                },
                {
                  role: 'user',
                  content: fullConversation
                }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1
            })

            const extractedContent = extractionCompletion.choices[0]?.message?.content
            if (!extractedContent) {
              extractionAttempts++
              continue
            }

            bookingData = JSON.parse(extractedContent)
            
            // Validate the extraction
            if (bookingData && typeof bookingData === 'object') {
              // Check if it's actually confirmed
              if (bookingData.confirmed === false) {
                logger.info('Booking discussed but not confirmed', { callId })
                break // Exit - not a real booking yet
              }
              break // Success
            } else {
              extractionAttempts++
            }

          } catch (extractError) {
            extractionAttempts++
            logger.warn('Booking extraction attempt failed', {
              attempt: extractionAttempts,
              error: extractError instanceof Error ? extractError.message : 'Unknown',
              callId
            })
            
            if (extractionAttempts >= maxExtractionAttempts) {
              logger.error('All booking extraction attempts failed', { callId })
              break
            }
          }
        }
        
        // Check if we have minimum required info
        if (bookingData && bookingData.customerName && bookingData.scheduledDate && bookingData.confirmed !== false) {
          // Create appointment
          const bookingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/appointments/ai-book`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              businessId: business.id,
              callId: callId,
              customerName: bookingData.customerName,
              customerPhone: bookingData.customerPhone || from,
              customerAddress: bookingData.customerAddress,
              serviceType: bookingData.serviceType || 'General Service',
              scheduledDate: bookingData.scheduledDate,
              scheduledTime: bookingData.scheduledTime,
              notes: bookingData.notes || fullConversation,
              conversationTranscript: fullConversation
            })
          })

          const bookingResult = await bookingResponse.json()
          
          if (bookingResult.success) {
            logger.info('Appointment auto-booked during call', {
              callId,
              appointmentId: bookingResult.appointment.id,
              businessId: business.id,
              customerName: bookingData.customerName
            })

            // Update call with appointment info
            await supabaseAdmin
              .from('calls')
              .update({
                appointment_id: bookingResult.appointment.id,
                outcome: 'appointment_scheduled',
                updated_at: new Date().toISOString()
              })
              .eq('call_id', callId)
          } else {
            logger.warn('Auto-booking failed during call', {
              callId,
              error: bookingResult.error
            })
          }
        }
      } catch (extractionError) {
        logger.warn('Booking extraction failed', { 
          error: extractionError instanceof Error ? extractionError.message : extractionError,
          callId
        })
      }
    }

    // Check for escalation triggers
    const escalationKeywords = ['manager', 'supervisor', 'emergency', 'urgent', 'asap', 'now', 'angry', 'frustrated']
    const needsEscalation = escalationKeywords.some(keyword => 
      userSpeech.toLowerCase().includes(keyword)
    )

    if (needsEscalation && business.escalation_phone) {
      return NextResponse.json({
        call_id: callId,
        status: 'escalating',
        instructions: [
          {
            instruction: 'say',
            text: 'Let me connect you with one of our team members right away.',
            voice: agent.configuration?.voice || 'alloy'
          },
          {
            instruction: 'dial',
            to: business.escalation_phone,
            from: to,
            timeout: 30
          }
        ]
      })
    }

    // Check if conversation is complete
    const endKeywords = ['bye', 'goodbye', 'thank', 'thanks', 'that\'s all', 'all set']
    const isComplete = endKeywords.some(keyword => userSpeech.toLowerCase().includes(keyword))

    if (isComplete) {
      return NextResponse.json({
        call_id: callId,
        status: 'complete',
        instructions: [
          {
            instruction: 'say',
            text: aiResponse,
            voice: agent.configuration?.voice || 'alloy'
          },
          {
            instruction: 'say',
            text: `Thank you for calling ${business.business_name}. Have a great day!`,
            voice: agent.configuration?.voice || 'alloy'
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
      booking_intent: hasBookingIntent,
      instructions: [
        {
          instruction: 'say',
          text: aiResponse,
          voice: agent.configuration?.voice || 'alloy',
          language: 'en'
        },
        {
          instruction: 'gather',
          input: ['speech'],
          timeout: 15,
          speech_timeout: 'auto',
          speech_model: 'default',
          action_on_empty_result: true,
          finish_on_key: '#',
          action: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/telnyx/voice-handler`
        }
      ]
    })

  } catch (error) {
    logger.error('Voice handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: 'telnyx/voice-handler'
    })
    
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'I apologize, but I\'m having trouble processing your request. Let me have someone call you back shortly.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    }, { status: 500 })
  }
}
