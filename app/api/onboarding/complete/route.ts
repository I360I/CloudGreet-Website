import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Accept both old and new format for backwards compatibility
const completeOnboardingSchema = z.object({
  // From existing OnboardingWizard component
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  services: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  businessHours: z.record(z.string(), z.any()).optional(),
  greetingMessage: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'casual']).optional(),
  specialties: z.array(z.string()).optional(),
  afterHoursPolicy: z.string().optional(),
  calendarProvider: z.string().optional(),
  promoCode: z.string().optional(),
  
  // New format (optional for backwards compat)
  business_description: z.string().optional(),
  years_in_business: z.string().optional(),
  team_size: z.string().optional(),
  service_radius: z.string().optional(),
  primary_services: z.array(z.string()).optional(),
  service_descriptions: z.record(z.string()).optional(),
  typical_project_value: z.string().optional(),
  emergency_services: z.boolean().optional(),
  business_hours: z.record(z.string(), z.any()).optional(),
  agent_name: z.string().optional(),
  agent_personality: z.enum(['professional', 'friendly', 'casual', 'enthusiastic']).optional(),
  greeting_style: z.string().optional(),
  custom_instructions: z.string().optional(),
  appointment_types: z.array(z.string()).optional(),
  qualification_questions: z.array(z.string()).optional(),
  escalation_triggers: z.array(z.string()).optional(),
  emergency_protocol: z.string().optional()
}).refine(data => 
  data.businessName || data.services || data.primary_services,
  { message: "At least basic business information is required" }
)

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Database not configured. Please contact support.'
      }, { status: 503 })
    }

    // Get authentication token
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    
    if (!jwtSecret) {
      return NextResponse.json({
        success: false,
        message: 'Server configuration error'
      }, { status: 500 })
    }

    // Decode JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        message: 'Invalid token'
      }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid token data'
      }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const rawData = completeOnboardingSchema.parse(body)

    // Normalize data from both old and new formats
    const services = rawData.services || rawData.primary_services || ['General Services']
    const serviceAreas = rawData.serviceAreas || ['Local Area']
    const businessHours = rawData.businessHours || rawData.business_hours || {}
    const greetingMessage = rawData.greetingMessage || rawData.greeting_style || ''
    const tone = rawData.tone || rawData.agent_personality || 'professional'
    const agentName = rawData.agent_name || `${rawData.businessName} AI Assistant` || 'AI Assistant'

    // Get current business data
    const { data: business, error: businessFetchError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (businessFetchError || !business) {
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    // Extract additional fields
    const specialties = rawData.specialties || []
    const afterHoursPolicy = rawData.afterHoursPolicy || 'voicemail'
    const calendarProvider = rawData.calendarProvider || 'google'
    
    // Update business with onboarding data (only existing fields)
    const { error: businessUpdateError } = await supabaseAdmin
      .from('businesses')
      .update({
        description: rawData.business_description || `Professional ${business.business_type} services`,
        services: services,
        service_areas: serviceAreas,
        business_hours: businessHours,
        greeting_message: greetingMessage || `Thank you for calling ${business.business_name}. How can I help you today?`,
        tone: tone,
        ai_tone: tone,
        custom_instructions: rawData.custom_instructions || `You are a helpful AI assistant for ${business.business_name}, a ${business.business_type} business. Be ${tone} and professional.`,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (businessUpdateError) {
      logger.error("Error updating business", {
        error: businessUpdateError.message,
        requestId,
        businessId
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to update business'
      }, { status: 500 })
    }

    // Determine voice based on personality and business type
    let voice = 'alloy'
    const personality = tone as string
    if (personality === 'professional') {
      voice = business.business_type === 'HVAC' ? 'nova' : 'onyx'
    } else if (personality === 'friendly') {
      voice = 'shimmer'
    } else if (personality === 'casual') {
      voice = 'echo'
    } else if (personality === 'enthusiastic') {
      voice = 'fable'
    }

    // Create comprehensive AI agent with all collected data
    const customInstructions = rawData.custom_instructions || `Be a professional, helpful AI receptionist for ${business.business_name}.`
    
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .insert({
        business_id: businessId,
        business_name: business.business_name,
        agent_name: agentName,
        is_active: false, // Will be activated after testing
        configuration: {
          // Business Context
          business_type: business.business_type,
          business_description: rawData.business_description || `Professional ${business.business_type} services`,
          years_in_business: rawData.years_in_business || '5',
          team_size: rawData.team_size || '1-5',
          service_radius: rawData.service_radius || '25',
          
          // Services
          services: services,
          service_descriptions: rawData.service_descriptions || {},
          typical_project_value: rawData.typical_project_value || '$500-$1,000',
          emergency_services: rawData.emergency_services || false,
          
          // Hours
          business_hours: businessHours,
          
          // AI Personality
          personality: tone,
          tone: tone,
          voice: voice,
          greeting_message: greetingMessage || `Thank you for calling ${business.business_name}. This is ${agentName}, how can I help you today?`,
          custom_instructions: `You are ${agentName}, the ${tone} AI receptionist for ${business.business_name}.

BUSINESS CONTEXT:
- Company: ${business.business_name} (${business.business_type})
- Location: ${business.address || 'Local area'}
- Description: ${rawData.business_description || `Professional ${business.business_type} services`}
- Services Offered: ${services.join(', ')}
- Service Areas: ${serviceAreas.join(', ')}
${specialties.length > 0 ? `- Specialties: ${specialties.join(', ')}` : ''}
- Contact: ${business.phone_number}
${business.website ? `- Website: ${business.website}` : ''}

BUSINESS HOURS:
${Object.entries(businessHours).map(([day, hours]: [string, any]) => 
  `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}`
).join('\n')}

AFTER HOURS POLICY: ${afterHoursPolicy === 'voicemail' ? 'Take voicemail' : afterHoursPolicy === 'sms' ? 'Offer to text' : 'Take message'}

PERSONALITY & STYLE:
- Tone: ${tone} and ${tone === 'professional' ? 'courteous' : tone === 'friendly' ? 'warm and approachable' : 'relaxed and conversational'}
- Voice: ${voice}
- Use natural, conversational language
- Show genuine interest in helping customers
- Be empathetic and understanding
${customInstructions ? `- ${customInstructions}` : ''}

YOUR RESPONSIBILITIES:
1. Answer calls with: "${greetingMessage || `Thank you for calling ${business.business_name}. How can I help you today?`}"
2. Listen carefully to understand customer needs
3. Ask clarifying questions about:
   - What service they need
   - Property type and location
   - Timeline/urgency
   - Budget range (if appropriate)
4. Qualify leads by matching their needs to our services
5. Schedule appointments during business hours
6. Provide accurate service information
7. Handle pricing questions professionally
8. Take detailed messages when needed
9. Make customers feel valued and heard

CONVERSATION GUIDELINES:
- Be warm, natural, and genuinely helpful
- Don't sound robotic or scripted
- Use the customer's name when they provide it
- Acknowledge their concerns with empathy
- Provide specific information, not generic responses
- If unsure, say "Let me have ${business.business_name} call you back to discuss that"
- Always end calls professionally with next steps

APPOINTMENT BOOKING:
- Check if requested time is during business hours
- Confirm customer name, phone, and service needed
- Provide appointment confirmation
- Offer to send SMS confirmation

Remember: You're representing ${business.business_name}. Every conversation is an opportunity to win a customer. Be professional, helpful, and make them feel like they called the right place.`,
          
          // Call Handling
          appointment_types: rawData.appointment_types || ['Service Call', 'Estimate', 'Emergency'],
          qualification_questions: rawData.qualification_questions || ['What type of property?', 'When do you need service?'],
          escalation_triggers: rawData.escalation_triggers || ['Customer is angry', 'Complex issue'],
          emergency_protocol: rawData.emergency_protocol || 'Dispatch ASAP',
          
          // AI Model Settings
          ai_model: 'gpt-4-turbo-preview',
          temperature: 0.8,
          presence_penalty: 0.3,
          frequency_penalty: 0.2,
          top_p: 0.9,
          max_tokens: 300,
          
          // Features
          conversation_style: 'human-like',
          emotional_intelligence: true,
          natural_speech_patterns: true,
          empathy_enabled: true,
          enable_call_recording: true,
          enable_transcription: true,
          enable_sms_forwarding: true,
          
          // Contact
          notification_phone: business.phone_number,
          escalation_phone: business.phone_number,
          emergency_contact: business.phone_number,
          
          created_at: new Date().toISOString()
        },
        performance_metrics: {
          total_calls: 0,
          successful_calls: 0,
          appointments_scheduled: 0,
          average_call_duration: 0,
          customer_satisfaction: 5.0,
          last_updated: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (agentError) {
      logger.error("Error creating AI agent", {
        error: agentError.message,
        requestId,
        businessId
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to create AI agent'
      }, { status: 500 })
    }

    logger.info('Onboarding completed successfully', {
      requestId,
      businessId,
      agentId: agent.id,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully! Your AI agent is ready to test.',
      businessId: businessId,
      agentId: agent.id,
      data: {
        business: {
          id: businessId,
          business_name: business.business_name,
          onboarding_completed: true
        },
        agent: {
          id: agent.id,
          name: agentName,
          personality: tone,
          is_active: false
        }
      },
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error("Onboarding error", { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      requestId,
      endpoint: 'complete_onboarding'
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to complete onboarding'
    }, { status: 500 })
  }
}
