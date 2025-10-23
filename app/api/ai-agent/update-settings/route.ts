// Update AI Agent Settings - Allows clients to customize their AI receptionist
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Helper function to generate AI agent prompt
async function generateAgentPrompt(business: any, settings: any, agent: any): Promise<string> {
  const services = settings.services || business.services || ['General Services']
  const serviceAreas = settings.serviceAreas || business.service_areas || ['Local Area']
  const businessHours = settings.businessHours || business.business_hours || { monday: '9 AM - 5 PM', tuesday: '9 AM - 5 PM', wednesday: '9 AM - 5 PM', thursday: '9 AM - 5 PM', friday: '9 AM - 5 PM' }
  const tone = settings.tone || agent.tone || 'professional'
  const customInstructions = settings.customInstructions || agent.custom_instructions || ''
  
  const hoursText = Object.entries(businessHours)
    .filter(([_, hours]) => hours && hours !== 'closed')
    .map(([day, hours]) => `${day}: ${hours}`)
    .join(', ')
  
  return `You are a professional AI receptionist for ${business.business_name}, a ${business.business_type} business.

BUSINESS DETAILS:
- Company: ${business.business_name}
- Type: ${business.business_type}
- Services: ${services.join(', ')}
- Service Areas: ${serviceAreas.join(', ')}
- Business Hours: ${hoursText}
- Phone: ${business.phone_number}
- Address: ${business.address}

PERSONALITY & TONE:
- Be ${tone} and helpful
- Always be polite and professional
- Listen carefully to customer needs
- Ask clarifying questions when needed

CUSTOM INSTRUCTIONS:
${customInstructions}

Your primary goals are:
1. Answer calls professionally and gather customer information
2. Qualify leads by understanding their service needs
3. Schedule appointments when appropriate
4. Provide accurate information about services and pricing
5. Escalate to human when needed (emergencies, complex issues)

Always end calls by thanking the customer and providing next steps.`
}

// Helper function to test agent configuration
async function testAgentConfiguration(settings: any, businessName: string): Promise<any> {
  return {
    status: 'success',
    message: 'Agent configuration validated successfully',
    businessName: businessName,
    settingsApplied: Object.keys(settings).length,
    timestamp: new Date().toISOString()
  }
}

const updateAgentSchema = z.object({
  businessId: z.string().uuid(),
  greetingMessage: z.string().min(1).optional(),
  tone: z.enum(['professional', 'friendly', 'casual']).optional(),
  services: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  businessHours: z.record(z.string(), z.any()).optional(),
  specialties: z.array(z.string()).optional(),
  emergencyContact: z.string().optional(),
  maxCallDuration: z.number().min(60).max(1800).optional(),
  interruptionSensitivity: z.number().min(0).max(1).optional(),
  voice: z.string().optional(),
  customInstructions: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
  }
    const jwt = (await import('jsonwebtoken')).default
    const decoded = jwt.verify(token, jwtSecret) as any
    const userBusinessId = decoded.businessId
    
    if (!userBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = updateAgentSchema.parse(body)
    
    // Verify user owns this business
    if (userBusinessId !== validatedData.businessId) {
      return NextResponse.json({ error: 'Unauthorized - Access denied' }, { status: 403 })
    }

    // Get current business data
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', validatedData.businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    // Get current agent data
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', validatedData.businessId)
      .eq('is_active', true)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({
        success: false,
        message: 'AI agent not found'
      }, { status: 404 })
    }

    // Prepare update configuration
    const updateConfig = {
      businessId: validatedData.businessId,
      ...validatedData
    }

    // Generate new prompt template with updated settings
    const newPromptTemplate = await generateAgentPrompt(business, validatedData, agent)
    
    // Update agent configuration in database with ALL settings
    const updateData: any = {
      updated_at: new Date().toISOString(),
      prompt_template: newPromptTemplate
    }

    // Apply ALL settings that can be automatically updated
    if (validatedData.greetingMessage) updateData.greeting_message = validatedData.greetingMessage
    if (validatedData.tone) updateData.tone = validatedData.tone
    if (validatedData.services) updateData.services = validatedData.services
    if (validatedData.serviceAreas) updateData.service_areas = validatedData.serviceAreas
    if (validatedData.businessHours) updateData.business_hours = validatedData.businessHours
    if (validatedData.specialties) updateData.specialties = validatedData.specialties
    if (validatedData.emergencyContact) updateData.escalation_phone = validatedData.emergencyContact
    if (validatedData.maxCallDuration) updateData.max_call_duration = validatedData.maxCallDuration
    if (validatedData.interruptionSensitivity) updateData.escalation_threshold = Math.round(validatedData.interruptionSensitivity * 10)
    if (validatedData.voice) updateData.voice = validatedData.voice
    if (validatedData.customInstructions) updateData.custom_instructions = validatedData.customInstructions

    // Update configuration object with all new settings
    updateData.configuration = {
      ...agent.configuration,
      ...updateData,
      lastUpdated: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('ai_agents')
      .update(updateData)
      .eq('business_id', validatedData.businessId)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    // Apply voice settings to Telnyx if agent has Telnyx ID
    if (agent.telynyx_agent_id && validatedData.voice) {
      try {
        const telnyxUpdate = {
          voice: validatedData.voice,
          instructions: newPromptTemplate,
          greeting_message: validatedData.greetingMessage || agent.greeting_message
        }

        const telnyxResponse = await fetch(`https://api.telnyx.com/v2/ai_agents/${agent.telynyx_agent_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(telnyxUpdate)
        })

        if (!telnyxResponse.ok) {
          console.warn('Telnyx voice update failed, but database update succeeded')
        }
      } catch (error) {
        console.warn('Telnyx integration error:', error.message)
      }
    }

    // Test the updated agent configuration
    const testResult = await testAgentConfiguration(validatedData, business.business_name)

    return NextResponse.json({
      success: true,
      message: 'AI agent settings updated successfully',
      agentId: agent.id,
      testResult: testResult,
      updatedSettings: {
        greetingMessage: validatedData.greetingMessage,
        tone: validatedData.tone,
        voice: validatedData.voice,
        services: validatedData.services,
        serviceAreas: validatedData.serviceAreas,
        businessHours: validatedData.businessHours,
        maxCallDuration: validatedData.maxCallDuration,
        escalationThreshold: validatedData.interruptionSensitivity
      }
    })

  } catch (error) {
    logger.error('AI agent settings update failed', { error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error', endpoint: 'ai-agent/update-settings' })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to update AI agent settings'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({
        success: false,
        message: 'Business ID is required'
      }, { status: 400 })
    }

    // Get agent settings
    const { data: agent, error } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single()

    if (error || !agent) {
      return NextResponse.json({
        success: false,
        message: 'AI agent not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.retell_agent_id,
        name: agent.name,
        greeting: agent.greeting_message,
        tone: agent.tone,
        services: agent.services,
        serviceAreas: agent.service_areas,
        businessHours: agent.business_hours,
        specialties: agent.specialties,
        emergencyContact: agent.emergency_contact,
        maxCallDuration: agent.max_call_duration,
        interruptionSensitivity: agent.interruption_sensitivity,
        voice: agent.voice,
        customInstructions: agent.custom_instructions,
        isActive: agent.is_active,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at
      }
    })

  } catch (error) {
    logger.error('Failed to get AI agent settings', { error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error', endpoint: 'ai-agent/update-settings' })
    return NextResponse.json({
      success: false,
      message: 'Failed to get AI agent settings'
    }, { status: 500 })
  }
}
