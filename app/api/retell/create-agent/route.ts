import { NextRequest, NextResponse } from 'next/server'

interface RetellAgentData {
  business_name: string
  business_type: string
  phone_number: string
  services: string[]
  voice_settings?: {
    voice: string
    speed: number
    temperature: number
  }
}


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'ready',
        message: 'Service is ready'
      }
    });
  } catch (error) {
    console.error('Error in GET method:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get service status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const agentData: RetellAgentData = await request.json()
    
    console.log('Creating Retell AI agent for:', agentData.business_name)

    const retellApiKey = process.env.RETELL_API_KEY
    
    if (!retellApiKey || retellApiKey.includes('your-') || retellApiKey.includes('demo-')) {
      return NextResponse.json({
        success: false,
        error: 'Retell AI API key not configured'
      }, { status: 503 })
    }

    // Create Retell AI agent
    const retellResponse = await fetch('https://api.retellai.com/v2/create-retell-llm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        llm_dynamic_variables: [
          {
            name: 'business_name',
            description: 'The name of the business',
            value: agentData.business_name
          },
          {
            name: 'business_type',
            description: 'The type of business (hvac, roofing, painting)',
            value: agentData.business_type
          },
          {
            name: 'services',
            description: 'Available services',
            value: agentData.services.join(', ')
          }
        ],
        llm_websocket_url: 'wss://api.retellai.com/v2/llm/stream',
        voice_id: 'alloy',
        voice_settings: {
          speed: agentData.voice_settings?.speed || 1.0,
          temperature: agentData.voice_settings?.temperature || 0.7
        },
        language: 'en',
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en'
        },
        agent_name: `${agentData.business_name} AI Receptionist`,
        llm_prompt: generateRetellPrompt(agentData),
        enable_backchannel: true,
        enable_transfer_to_human: true,
        max_duration_seconds: 1800,
        interruption_threshold: 500,
        silence_timeout_seconds: 30,
        response_delay_seconds: 0.1,
        llm_temperature: 0.7,
        llm_model: 'gpt-4o-mini',
        end_call_after_silence_ms: 10000,
        end_call_phrases: ['goodbye', 'bye', 'thank you', 'have a good day'],
        dynamic_variables: [
          {
            name: 'business_name',
            value: agentData.business_name
          }
        ]
      })
    })

    if (!retellResponse.ok) {
      const errorData = await retellResponse.text()
      console.error('Retell API error:', errorData)
      return NextResponse.json({
        success: false,
        error: 'Failed to create Retell agent',
        details: errorData
      }, { status: 500 })
    }

    const retellAgent = await retellResponse.json()

    return NextResponse.json({
      success: true,
      agent_id: retellAgent.retell_llm_id,
      agent_name: retellAgent.agent_name,
      status: 'active',
      voice_settings: retellAgent.voice_settings,
      webhook_url: '/api/retell-webhook',
      created_at: new Date().toISOString(),
      retell_data: retellAgent
    })

  } catch (error) {
    console.error('Error creating Retell agent:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateRetellPrompt(agentData: RetellAgentData): string {
  return `You are an AI receptionist for ${agentData.business_name}, a ${agentData.business_type} company.

BUSINESS INFORMATION:
- Business Name: ${agentData.business_name}
- Business Type: ${agentData.business_type}
- Services: ${agentData.services.join(', ')}
- Phone Number: ${agentData.phone_number}

YOUR ROLE:
You are a professional, friendly AI receptionist who handles incoming calls for ${agentData.business_name}. Your primary goals are:
1. Greet callers warmly and professionally
2. Understand their specific needs
3. Assess urgency (emergency vs. routine)
4. Schedule appointments when requested
5. Provide helpful information about services
6. Collect necessary contact information

CONVERSATION FLOW:
1. Answer with: "Hello, thank you for calling ${agentData.business_name}. This is your AI assistant. How can I help you today?"
2. Listen to their needs and ask clarifying questions
3. If they want to book an appointment, collect:
   - Preferred date and time
   - Service needed
   - Contact information (name, phone, email)
   - Address if needed
4. Confirm all details before booking
5. End with: "Thank you for calling ${agentData.business_name}. Have a great day!"

EMERGENCY DETECTION:
Watch for urgent keywords: emergency, urgent, broken, leak, no heat, no ac, not working
If emergency detected, prioritize immediate scheduling and express urgency.

APPOINTMENT BOOKING:
When booking appointments, use the calendar integration to check availability and confirm times.

PERSONALITY:
- Professional and courteous
- Helpful and knowledgeable
- Patient and understanding
- Efficient but not rushed

Remember: You represent ${agentData.business_name} and should always maintain a professional, helpful demeanor.`
}

