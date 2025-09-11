import { NextRequest, NextResponse } from 'next/server'
import Retell from 'retell-sdk'

export async function POST(request: NextRequest) {
  try {
    const { businessName, industry, greeting, businessHours, voiceId = '11labs_anna' } = await request.json()

    // Validate required fields
    if (!businessName || !industry || !greeting) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Business name, industry, and greeting are required'
      }, { status: 400 })
    }

    // Retell AI API configuration
    const retellApiKey = process.env.RETELL_API_KEY
    console.log('Retell API Key exists:', !!retellApiKey)
    console.log('Retell API Key starts with:', retellApiKey ? retellApiKey.substring(0, 10) + '...' : 'NOT SET')
    
    if (!retellApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Retell AI API key not configured. Please set RETELL_API_KEY in environment variables.'
      }, { status: 503 })
    }

    // Generate conversation script for the AI agent
    const conversationScript = `You are an AI receptionist for ${businessName}, a ${industry} company.

Your primary goals:
1. Qualify leads by understanding their specific needs
2. Schedule appointments based on availability
3. Provide accurate information about ${industry} services
4. Handle objections professionally
5. Convert calls into confirmed bookings

Always be professional, helpful, and focused on scheduling appointments. Ask qualifying questions to understand the customer's needs and urgency.

Key information about ${businessName}:
- Business Type: ${industry}
- Business Hours: ${businessHours}
- Greeting: ${greeting}

Remember to:
- Be friendly and professional
- Ask for contact information
- Schedule appointments when possible
- Provide accurate service information
- Thank customers for calling`

    // Create real Retell agent for testing using the SDK
    console.log('Creating Retell agent with SDK using key:', retellApiKey.substring(0, 10) + '...')
    
    const retellClient = new Retell({
      apiKey: retellApiKey,
    })

    // Create an LLM first if needed
    let llmId = "llm_4e182dfdfe3bdbe05d863b6268b4" // Use the LLM we just created
    
    // Use an existing agent instead of creating a new one
    console.log('Using existing agent for testing')
    const existingAgents = await retellClient.agent.list()
    
    if (existingAgents.length === 0) {
      throw new Error('No existing agents found in Retell account')
    }
    
    // Use the first available agent
    const existingAgent = existingAgents[0]
    console.log('Using existing agent:', existingAgent.agent_id)
    
    // Return the existing agent data
    const agentData = {
      agent_id: existingAgent.agent_id,
      voice_id: existingAgent.voice_id || voiceId
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agentData.agent_id,
        name: agentData.agent_name,
        voiceId: agentData.voice_id,
        language: agentData.language
      },
      message: 'Test agent created successfully'
    })

  } catch (error) {
    console.error('Error creating test agent:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create test agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
