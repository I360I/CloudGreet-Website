import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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

    // Create premium AI session with realtime capabilities
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      instructions: `You are CloudGreet's premium AI receptionist - the most advanced, human-like AI assistant in the industry.

BUSINESS CONTEXT:
- Company: CloudGreet Demo (HVAC Services)
- Services: Heating, Cooling, Air Quality, Emergency Repairs
- Hours: 24/7 Emergency Service Available
- Coverage: Washington DC, Maryland, Virginia
- Specialties: High-efficiency systems, smart home integration, energy savings

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
          name: 'get_quote',
          description: 'Get a quote for HVAC services',
          parameters: {
            type: 'object',
            properties: {
              service_type: {
                type: 'string',
                description: 'Type of service needed'
              },
              property_size: {
                type: 'string',
                description: 'Size of property (sq ft)'
              },
              current_system_age: {
                type: 'string',
                description: 'Age of current HVAC system'
              },
              specific_requirements: {
                type: 'string',
                description: 'Any specific requirements or preferences'
              }
            },
            required: ['service_type']
          }
        }
      ],
      tool_choice: 'auto'
    })

    logger.info('Premium realtime session created', { 
      session_id: session.id,
      call_id: body.call_id
    })

    // Return the session details for Telnyx to connect
    return NextResponse.json({
      session_id: session.id,
      status: 'connected',
      message: 'Premium realtime AI session established'
    })

  } catch (error) {
    logger.error('Premium realtime stream error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Failed to create premium realtime session' 
    }, { status: 500 })
  }
}
