import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface RealtimeSession {
  id: string;
  created_at: number;
  expires_at: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    logger.info('Premium realtime stream started', { 
      call_id: body.call_id,
      from: body.from,
      to: body.to
    })

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured for premium realtime')
      return NextResponse.json({ 
        error: 'OpenAI not configured' 
      }, { status: 503 })
    }

    // Get business context for personalized AI
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('phone_number', body.to)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for realtime stream', { 
        to: body.to, 
        error: businessError?.message 
      })
      return NextResponse.json({ 
        error: 'Business not found' 
      }, { status: 404 })
    }

    const agent = business.ai_agents
    const businessName = business.business_name || 'CloudGreet'
    const businessType = business.business_type || 'AI Receptionist Service'
    const services = agent?.configuration?.services || business.services || ['General Services']
    const hours = agent?.configuration?.hours || business.business_hours || '24/7'

    // Create premium AI session with latest GPT-5 realtime capabilities
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: 'alloy',
      instructions: `You are ${businessName}'s premium AI receptionist - the most advanced, human-like AI assistant in the industry.

BUSINESS CONTEXT:
- Company: ${businessName} (${businessType})
- Services: ${services.join(', ')}
- Hours: ${hours}
- Specialties: Professional service, customer satisfaction, expert assistance

YOUR PERSONALITY:
- Warm, professional, and genuinely helpful
- Sound like a real human receptionist, not a robot
- Use natural speech patterns with appropriate pauses and emphasis
- Show genuine interest in helping customers
- Be conversational and engaging
- Use "um", "let me see", "absolutely" naturally
- Laugh appropriately and show personality

CONVERSATION FLOW:
1. GREETING: "Hi there! Thank you for calling CloudGreet, this is Sarah. How can I help you today?"
2. LISTEN: Pay full attention to what they're saying
3. RESPOND: Give helpful, specific responses based on their needs
4. QUALIFY: Ask smart follow-up questions to understand their situation
5. SOLUTIONS: Offer specific solutions and next steps
6. CLOSE: Schedule appointments, get contact info, provide value

KEY BEHAVIORS:
- Always sound human and natural
- Use their name if they provide it
- Show empathy for heating/cooling problems
- Be proactive about scheduling
- Offer emergency services when appropriate
- Sound confident about your expertise
- Use industry terms naturally
- Be patient with questions

EMERGENCY HANDLING:
- If they mention "emergency", "no heat", "no AC", "broken" - immediately offer emergency service
- Sound urgent but calm: "Oh no, I'm so sorry to hear that. Let me get you connected with our emergency team right away."

APPOINTMENT BOOKING:
- Be proactive about scheduling
- Ask about their preferred times
- Confirm contact information
- Sound excited about helping them

Remember: You're not just answering questions - you're building relationships and solving real problems. Sound like the best receptionist they've ever talked to.`,
      tools: [
        {
          type: 'function',
          name: 'schedule_appointment',
          description: 'Schedule an appointment for the customer',
          parameters: {
            type: 'object',
            properties: {
              service_type: {
                type: 'string',
                description: 'Type of service needed (heating, cooling, maintenance, emergency)'
              },
              preferred_date: {
                type: 'string',
                description: 'Customer preferred date'
              },
              preferred_time: {
                type: 'string',
                description: 'Customer preferred time'
              },
              customer_name: {
                type: 'string',
                description: 'Customer name'
              },
              customer_phone: {
                type: 'string',
                description: 'Customer phone number'
              },
              customer_email: {
                type: 'string',
                description: 'Customer email address'
              },
              issue_description: {
                type: 'string',
                description: 'Description of the HVAC issue'
              }
            },
            required: ['service_type', 'customer_name', 'customer_phone']
          }
        },
        {
          type: 'function',
          name: 'get_business_info',
          description: 'Get information about the business',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          type: 'function',
          name: 'send_sms',
          description: 'Send SMS message to customer',
          parameters: {
            type: 'object',
            properties: {
              phone_number: {
                type: 'string',
                description: 'Phone number to send SMS to'
              },
              message: {
                type: 'string',
                description: 'SMS message content'
              }
            },
            required: ['phone_number', 'message']
          }
        }
      ],
      tool_choice: 'auto'
    })

    logger.info('Premium realtime session created', {
      session_id: (session as any).id || 'unknown',
      call_id: body.call_id,
      business_id: business.id
    })

    // Store session info for function calling
    const sessionData = {
      session_id: (session as any).id,
      business_id: business.id,
      call_id: body.call_id,
      created_at: new Date().toISOString()
    }

    // Store session in database for function calling context
    const { error: sessionError } = await supabaseAdmin
      .from('realtime_sessions')
      .insert(sessionData)
    
    if (sessionError) {
      logger.error('Failed to store session', { error: sessionError.message })
    }

    // Return the session details for Telnyx to connect
    return NextResponse.json({
      session_id: (session as any).id || 'unknown',
      status: 'connected',
      message: 'Premium realtime AI session established',
      business_name: businessName
    })

  } catch (error: unknown) {
    logger.error('Premium realtime stream error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Failed to create premium realtime session' 
    }, { status: 500 })
  }
}