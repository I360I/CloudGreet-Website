import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telynyxClient } from '@/lib/telynyx'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateAgentSchema = z.object({
  greetingMessage: z.string().min(1, 'Greeting message is required'),
  tone: z.enum(['professional', 'friendly', 'casual'], {
    message: 'Invalid tone'
  }),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], {
    message: 'Invalid voice selection'
  }).optional(),
  customInstructions: z.string().optional(),
  businessHours: z.record(z.string(), z.any()).optional(),
  services: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  enableSmsForwarding: z.boolean().optional(),
  notificationPhone: z.string().optional(),
  enableCallRecording: z.boolean().optional(),
  enableTranscription: z.boolean().optional(),
  maxCallDuration: z.number().min(30).max(1800).optional(), // 30 seconds to 30 minutes
  escalationThreshold: z.number().min(1).max(10).optional(), // 1-10 confidence threshold
  escalationPhone: z.string().optional()
})

export async function PUT(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateAgentSchema.parse(body)

    // Get current business and agent data
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({
        success: false,
        message: 'AI agent not found'
      }, { status: 404 })
    }

    // Update business settings
    const businessUpdates: any = {}
    if (validatedData.enableSmsForwarding !== undefined) {
      businessUpdates.sms_forwarding_enabled = validatedData.enableSmsForwarding
    }
    if (validatedData.notificationPhone) {
      businessUpdates.notification_phone = validatedData.notificationPhone
    }

    if (Object.keys(businessUpdates).length > 0) {
      await supabaseAdmin
        .from('businesses')
        .update(businessUpdates)
        .eq('id', businessId)
    }

    // Update AI agent settings
    const agentUpdates: any = {
      greeting_message: validatedData.greetingMessage,
      tone: validatedData.tone,
      updated_at: new Date().toISOString()
    }

    if (validatedData.voice) {
      agentUpdates.voice = validatedData.voice
    }
    if (validatedData.customInstructions) {
      agentUpdates.custom_instructions = validatedData.customInstructions
    }
    if (validatedData.businessHours) {
      agentUpdates.business_hours = validatedData.businessHours
    }
    if (validatedData.services) {
      agentUpdates.services = validatedData.services
    }
    if (validatedData.serviceAreas) {
      agentUpdates.service_areas = validatedData.serviceAreas
    }
    if (validatedData.enableCallRecording !== undefined) {
      agentUpdates.enable_call_recording = validatedData.enableCallRecording
    }
    if (validatedData.enableTranscription !== undefined) {
      agentUpdates.enable_transcription = validatedData.enableTranscription
    }
    if (validatedData.maxCallDuration) {
      agentUpdates.max_call_duration = validatedData.maxCallDuration
    }
    if (validatedData.escalationThreshold) {
      agentUpdates.escalation_threshold = validatedData.escalationThreshold
    }
    if (validatedData.escalationPhone) {
      agentUpdates.escalation_phone = validatedData.escalationPhone
    }

    // Update prompt template with new settings
    const services = validatedData.services || agent.services || []
    const serviceAreas = validatedData.serviceAreas || agent.service_areas || []
    const customInstructions = validatedData.customInstructions || ''
    
    agentUpdates.prompt_template = `You are an AI assistant for ${business.business_name}, a ${business.business_type} company. 

Your role:
- Answer calls professionally and warmly
- Qualify leads by asking about their needs
- Schedule appointments when appropriate
- Provide business information
- Transfer to human when needed

Business details:
- Name: ${business.business_name}
- Type: ${business.business_type}
- Services: ${services.join(', ')}
- Service Areas: ${serviceAreas.join(', ')}
- Hours: ${JSON.stringify(validatedData.businessHours || agent.business_hours || {})}
- Phone: ${business.phone_number}
- Address: ${business.address}

Tone: ${validatedData.tone}
Greeting: ${validatedData.greetingMessage}

${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

Always be professional, helpful, and try to convert calls into appointments.`

    const { data: updatedAgent, error: updateError } = await supabaseAdmin
      .from('ai_agents')
      .update(agentUpdates)
      .eq('id', agent.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating AI agent', { 
        error: updateError, 
        requestId,
        businessId,
        userId,
        action: 'update_ai_agent'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to update AI agent'
      }, { status: 500 })
    }

    // Update Telynyx agent if voice changed
    if (validatedData.voice && agent.telynyx_agent_id) {
      try {
        await telynyxClient.updateAgent(agent.telynyx_agent_id, {
          voice: validatedData.voice,
          instructions: agentUpdates.prompt_template
        })
      } catch (error) {
        logger.warn('Failed to update Telynyx agent', {
          requestId,
          businessId,
          error: error.message
        })
      }
    }

    // Log the update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        business_id: businessId,
        user_id: userId,
        action: 'update_ai_agent',
        details: {
          updated_fields: Object.keys(agentUpdates),
          request_id: requestId
        },
        created_at: new Date().toISOString()
      })

    logger.info('AI agent updated successfully', {
      requestId,
      businessId,
      userId,
      updatedFields: Object.keys(agentUpdates),
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'AI agent updated successfully',
      data: {
        agent: updatedAgent,
        updatedFields: Object.keys(agentUpdates)
      }
    })

  } catch (error) {
    logger.error('AI agent update error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      requestId,
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id'),
      duration: Date.now() - startTime
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
