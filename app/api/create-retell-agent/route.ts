import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../lib/error-handler'

interface RetellAgentData {
  businessName: string
  businessType: string
  businessHours: any
  services: string[]
  aiPersonality: string
  phoneNumber: string
  email: string
}

// Generate conversation script for the AI agent
function generateConversationScript(businessData: RetellAgentData): string {
  const { businessName, businessType, services, aiPersonality } = businessData
  
  const servicesList = services?.join(', ') || 'general services'
  const personality = aiPersonality || 'professional'
  
  return `You are an AI receptionist for ${businessName}, a ${businessType} company.

Your primary goals:
1. Qualify leads by understanding their specific needs
2. Schedule appointments based on availability
3. Provide accurate information about services: ${servicesList}
4. Handle objections professionally
5. Convert calls into confirmed bookings

Always be ${personality}, helpful, and focused on scheduling appointments. Ask qualifying questions to understand the customer's needs and urgency.

Key information about ${businessName}:
- Business Type: ${businessType}
- Services: ${servicesList}
- Personality: ${personality}

Remember to:
- Be friendly and professional
- Ask for contact information
- Schedule appointments when possible
- Provide accurate service information
- Thank customers for calling`
}

export async function POST(request: NextRequest) {
  try {
    const businessData: RetellAgentData = await request.json()
    
    console.log('Received business data:', businessData)

    // Validate required fields
    if (!businessData.businessName || !businessData.businessType || !businessData.email) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Business name, type, and email are required'
      }, { status: 400 })
    }

    // Retell AI API configuration
    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Retell AI API key not configured. Please set RETELL_API_KEY in environment variables.'
      }, { status: 503 })
    }

    // Create real Retell agent
    const agentResponse = await fetch('https://api.retellai.com/v2/create-agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        llm_dynamic_config: {
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 1500,
          system_prompt: generateConversationScript(businessData)
        },
        voice_id: "11labs_anna",
        voice_config: {
          speed: 1.0,
          stability: 0.71,
          clarity: 0.76,
          style: 0.0
        },
        language: "en",
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en"
        },
        recording_config: {
          audio_encoding: "mp3",
          sample_rate: 24000,
          channels: 1
        },
        webhook_url: process.env.NODE_ENV === 'development' 
          ? 'https://your-ngrok-url.ngrok.io/api/retell-webhook'
          : 'https://cloudgreet.com/api/retell-webhook',
        metadata: {
          business_name: businessData.businessName,
          business_type: businessData.businessType,
          services: businessData.services
        }
      })
    })

    if (!agentResponse.ok) {
      throw new Error(`Retell API error: ${agentResponse.status} ${agentResponse.statusText}`)
    }

    const agentData = await agentResponse.json()
    
    return NextResponse.json({ success: true, data: agentData })

  } catch (error) {
    console.error('Error creating Retell agent:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}