import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../lib/error-handler'

interface PhoneNumberRequest {
  businessName: string
  businessType: string
  areaCode?: string
  agentId: string
}

export async function POST(request: NextRequest) {
  try {
    const { businessName, businessType, areaCode, agentId }: PhoneNumberRequest = await request.json()

    // Validate required fields
    if (!businessName || !businessType || !agentId) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Business name, type, and agent ID are required'
      }, { status: 400 })
    }

    console.log(`🤖 Setting up Retell AI automation for ${businessName}`)
    console.log(`🤖 Agent ID: ${agentId}`)

    // Focus on Retell AI agent configuration and automation setup
    // The phone number will be configured manually or through existing business number
    
    // Update Retell agent with business-specific configuration
    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey || retellApiKey.includes('your-') || retellApiKey.includes('demo-')) {
      return NextResponse.json({
        success: false,
        error: 'Retell AI API key not configured. Please set RETELL_API_KEY in environment variables.'
      }, { status: 503 })
    }

    // Configure the Retell agent for maximum automation
    const agentConfig = {
      llm_dynamic_config: {
        model: "gpt-4o-mini",
        temperature: 0.3, // More consistent responses
        max_tokens: 1500, // Allow for longer conversations
        system_prompt: `You are an AI receptionist for ${businessName}, a ${businessType} company. 

Your primary goals:
1. Qualify leads by understanding their specific needs
2. Schedule appointments based on availability
3. Provide accurate information about services
4. Handle objections professionally
5. Convert calls into confirmed bookings

Always be professional, helpful, and focused on scheduling appointments. Ask qualifying questions to understand the customer's needs and urgency.`
      },
      voice_id: "11b74c48-2a66-4c88-8fd1-5e3f4d4b4b4b",
      voice_config: {
        speed: 1.0,
        pitch: 1.0,
        emotion: "professional"
      },
      language: "en-US",
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en-US"
      },
      recording_config: {
        audio_encoding: "mp3",
        sample_rate: 24000,
        channels: 1
      },
      metadata: {
        business_name: businessName,
        business_type: businessType,
        automation_level: "maximum",
        setup_date: new Date().toISOString()
      }
    }

    // Update the Retell agent with enhanced configuration
    const updateResponse = await fetch(`https://api.retellai.com/v2/update-agent/${agentId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentConfig)
    })

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text()
      console.error('Retell agent update error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to configure Retell agent',
        details: errorData
      }, { status: 500 })
    }

    const updatedAgent = await updateResponse.json()
    
    console.log(`✅ Retell AI agent ${agentId} configured for maximum automation`)

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: `${businessName} AI Receptionist`,
        status: 'configured',
        automationLevel: 'maximum',
        configuredAt: new Date().toISOString()
      },
      message: `Retell AI agent configured for maximum automation. Ready to handle calls with your existing phone number or a new number you provide.`,
      nextSteps: [
        'Configure your phone number to forward calls to the Retell agent',
        'Test the agent with sample calls',
        'Monitor performance through the dashboard'
      ]
    })

  } catch (error) {
    console.error('Error purchasing phone number:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
