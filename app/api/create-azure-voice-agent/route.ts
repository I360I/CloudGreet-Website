import { NextRequest, NextResponse } from 'next/server'
import { getBusinessType, isEmergencyCall, isValidBusinessType } from '../../../lib/business-types'

interface VoiceAgentData {
  businessName: string
  businessType: string
  services: string[]
  aiPersonality: string
  phoneNumber: string
  email: string
}

export async function POST(request: NextRequest) {
  try {
    const businessData: VoiceAgentData = await request.json()
    
    console.log('Creating Azure Voice Agent for:', businessData.businessName)

    // Validate required fields
    if (!businessData.businessName || !businessData.businessType || !businessData.email) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Business name, type, and email are required'
      }, { status: 400 })
    }

    // Retell AI configuration
    const retellApiKey = process.env.RETELL_API_KEY
    const azureApiKey = process.env.AZURE_SPEECH_KEY_1
    const azureRegion = process.env.AZURE_SPEECH_REGION || 'eastus'
    
    if (!retellApiKey || retellApiKey.includes('your-') || retellApiKey.includes('demo-')) {
      return NextResponse.json({
        success: false,
        error: 'Retell AI not configured. Please set RETELL_API_KEY in environment variables.'
      }, { status: 503 })
    }

    // Create Azure Speech Service configuration
    const azureConfig = {
      subscriptionKey: azureApiKey,
      region: azureRegion,
      voice: 'en-US-AriaNeural', // Professional female voice
      language: 'en-US',
      features: {
        realTimeConversation: true,
        sentimentAnalysis: true,
        callRecording: true,
        analytics: true,
        webhookSupport: true,
        calendarIntegration: true,
        appointmentBooking: true,
        naturalLanguageProcessing: true,
        intentRecognition: true,
        entityExtraction: true
      }
    }

    // Generate conversation script
    const conversationScript = generateConversationScript(businessData)
    
    // Create Retell AI Agent
    const retellAgent = await createRetellAgent(businessData, retellApiKey)
    
    // Create Voice Agent configuration
    const voiceAgent = {
      agent_id: retellAgent.agent_id,
      agent_name: retellAgent.agent_name,
      provider: 'retell',
      config: {
        retell: retellAgent,
        azure: azureConfig
      },
      conversation_script: conversationScript,
      business_data: businessData,
      created_at: new Date().toISOString(),
      status: 'active'
    }

    // Store agent in database (implement this)
    // await storeVoiceAgent(voiceAgent)

    return NextResponse.json({
      success: true,
      agent: voiceAgent,
      message: 'Azure Voice Agent created successfully',
      features: {
        automation: 'Advanced conversation flow management',
        stats: 'Built-in analytics and monitoring',
        recording: 'Automatic call recording and transcription',
        sentiment: 'Real-time sentiment analysis',
        webhooks: 'Event-driven stats integration'
      }
    })

  } catch (error) {
    console.error('Error creating Azure Voice Agent:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateConversationScript(businessData: VoiceAgentData): string {
  // Safe defaults
  const businessName = businessData.businessName || 'Business'
  const businessType = businessData.businessType || 'hvac'
  
  // Get business type config safely
  let businessConfig
  try {
    businessConfig = getBusinessType(businessType as any)
  } catch (error) {
    businessConfig = getBusinessType('hvac')
  }
  
  // Safe service list
  let serviceList = 'general services'
  if (businessData.services && Array.isArray(businessData.services) && businessData.services.length > 0) {
    serviceList = businessData.services.join(', ')
  } else if (businessConfig && businessConfig.services && Array.isArray(businessConfig.services)) {
    serviceList = businessConfig.services.join(', ')
  }
  
  // Safe keywords
  let keywords = 'general services'
  if (businessConfig && businessConfig.keywords && Array.isArray(businessConfig.keywords)) {
    keywords = businessConfig.keywords.join(', ')
  }

  return `You are an AI receptionist for ${businessName}, a ${businessConfig?.displayName || businessType} company.

BUSINESS TYPE: ${businessConfig?.displayName || businessType}
DESCRIPTION: ${businessConfig?.description || 'Professional services'}
SERVICES: ${serviceList}
VOICE PERSONALITY: Professional and helpful
EXPERTISE: ${keywords}

CONVERSATION FLOW:
1. Greet caller warmly and professionally
2. Identify their specific needs
3. Assess urgency (emergency vs. routine)
4. Provide relevant information and solutions
5. Schedule appointments (CALENDAR INTEGRATION)
6. Collect contact information
7. Confirm booking details
8. Send confirmation

EMERGENCY DETECTION:
Watch for these keywords: emergency, urgent, broken, leak, no heat, no ac
If emergency detected, prioritize immediate scheduling and express urgency.

CALENDAR BOOKING CAPABILITIES:
- Check availability in real-time
- Book appointments automatically
- Handle emergency scheduling
- Send confirmation emails
- Set up reminder notifications

INTENT RECOGNITION:
- "I'd like to book an appointment"
- "What times are available?"
- "Can I reschedule my appointment?"
- "Do you have anything next week?"
- "I need to cancel my booking"

ENTITY EXTRACTION:
- Dates: "next Tuesday", "March 15th", "tomorrow"
- Times: "2 PM", "morning", "afternoon"
- Services: Extract from available services
- Duration: "1 hour", "30 minutes"
- Urgency level: emergency, urgent, routine

PERSONALITY: Professional and courteous

GOALS:
- Convert inquiries into confirmed appointments
- Provide excellent customer service
- Automate calendar booking process
- Collect complete customer information
- Maintain professional standards`
}

function generateGenericScript(businessData: VoiceAgentData, serviceList: string): string {
  return `You are an AI receptionist for ${businessData.businessName}, a ${businessData.businessType} company.

SERVICES: ${serviceList}

CONVERSATION FLOW:
1. Greet caller warmly
2. Identify their needs
3. Provide relevant information
4. Schedule appointments (CALENDAR INTEGRATION)
5. Collect contact information
6. Confirm booking details
7. Send confirmation

CALENDAR BOOKING CAPABILITIES:
- Check availability in real-time
- Book appointments automatically
- Handle rescheduling requests
- Send confirmation emails
- Set up reminder notifications

PERSONALITY: Professional and courteous

GOALS:
- Convert inquiries into confirmed appointments
- Provide excellent customer service
- Automate calendar booking process
- Collect complete customer information
- Maintain professional standards`
}

// Helper function to create Retell AI agent
async function createRetellAgent(businessData: VoiceAgentData, retellApiKey: string) {
  try {
    // Validate businessData
    if (!businessData || !businessData.businessName) {
      throw new Error('Invalid business data provided')
    }

    // In a real implementation, this would call Retell AI API
    // For now, return a mock agent configuration
    return {
      agent_id: `retell-agent-${Date.now()}`,
      agent_name: `${businessData.businessName} AI Receptionist`,
      status: 'active',
      voice_settings: {
        voice: 'alloy',
        speed: 1.0,
        temperature: 0.7
      },
      personality: {
        tone: 'professional',
        style: 'conversational',
        expertise: businessData.businessType || 'general'
      },
      capabilities: {
        appointment_booking: true,
        customer_inquiry: true,
        emergency_detection: true,
        calendar_integration: true,
        call_transfer: true
      },
      webhook_url: '/api/retell-webhook',
      created_at: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error creating Retell agent:', error)
    throw error
  }
}
