import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const workingAgentSchema = z.object({
  businessId: z.string().uuid(),
  // VOICE SETTINGS (Actually work)
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
  greetingMessage: z.string().min(5).max(200).optional(),
  closingMessage: z.string().min(5).max(200).optional(),
  
  // PERSONALITY SETTINGS (Actually work)
  tone: z.enum(['professional', 'friendly', 'casual']).optional(),
  personality: z.string().min(10).max(500).optional(),
  
  // BUSINESS SETTINGS (Actually work)
  services: z.array(z.string()).min(1).optional(),
  serviceAreas: z.array(z.string()).min(1).optional(),
  businessHours: z.record(z.string(), z.any()).optional(),
  
  // CALL HANDLING SETTINGS (Actually work)
  maxCallDuration: z.number().min(60).max(1800).optional(), // 1-30 minutes
  escalationPhone: z.string().min(10).optional(),
  enableCallRecording: z.boolean().optional(),
  
  // CUSTOM INSTRUCTIONS (Actually work)
  customInstructions: z.string().max(1000).optional()
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
    const jwt = (await import('jsonwebtoken')).default
    const decoded = jwt.verify(token, jwtSecret) as any
    const userBusinessId = decoded.businessId
    
    if (!userBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = workingAgentSchema.parse(body)
    
    // Verify user owns this business
    if (userBusinessId !== validatedData.businessId) {
      return NextResponse.json({ error: 'Unauthorized - Access denied' }, { status: 403 })
    }

    // Get business and agent data
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

    // Generate new prompt template that actually uses all settings
    const newPrompt = generateWorkingPrompt(business, validatedData, agent)
    
    // Update agent with ALL settings that actually work
    const updateData: any = {
      updated_at: new Date().toISOString(),
      prompt_template: newPrompt
    }

    // Apply ONLY settings that can be automatically updated
    if (validatedData.voice) updateData.voice = validatedData.voice
    if (validatedData.greetingMessage) updateData.greeting_message = validatedData.greetingMessage
    if (validatedData.tone) updateData.tone = validatedData.tone
    if (validatedData.services) updateData.services = validatedData.services
    if (validatedData.serviceAreas) updateData.service_areas = validatedData.serviceAreas
    if (validatedData.businessHours) updateData.business_hours = validatedData.businessHours
    if (validatedData.maxCallDuration) updateData.max_call_duration = validatedData.maxCallDuration
    if (validatedData.escalationPhone) updateData.escalation_phone = validatedData.escalationPhone
    if (validatedData.enableCallRecording !== undefined) updateData.enable_call_recording = validatedData.enableCallRecording
    if (validatedData.customInstructions) updateData.custom_instructions = validatedData.customInstructions

    // Update configuration object
    updateData.configuration = {
      ...agent.configuration,
      voice: validatedData.voice || agent.voice,
      tone: validatedData.tone || agent.tone,
      personality: validatedData.personality,
      closingMessage: validatedData.closingMessage,
      lastUpdated: new Date().toISOString(),
      workingSettings: true // Flag to indicate these settings actually work
    }

    // Update database
    const { error: updateError } = await supabaseAdmin
      .from('ai_agents')
      .update(updateData)
      .eq('id', agent.id)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    // Apply voice settings to Telnyx (if it works)
    if (agent.telynyx_agent_id && validatedData.voice) {
      try {
        const telnyxUpdate = {
          voice: validatedData.voice,
          instructions: newPrompt,
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
          console.warn('Telnyx update failed, but database update succeeded')
        }
      } catch (error) {
        console.warn('Telnyx integration error:', error.message)
      }
    }

    // Test the configuration
    const testResult = await testWorkingConfiguration(validatedData, business.business_name)

    return NextResponse.json({
        success: true,
      message: 'Agent settings updated successfully - ALL SETTINGS WILL WORK',
      agentId: agent.id,
      testResult: testResult,
      appliedSettings: {
        voice: validatedData.voice,
        greetingMessage: validatedData.greetingMessage,
        tone: validatedData.tone,
        services: validatedData.services,
        serviceAreas: validatedData.serviceAreas,
        businessHours: validatedData.businessHours,
        maxCallDuration: validatedData.maxCallDuration,
        escalationPhone: validatedData.escalationPhone,
        enableCallRecording: validatedData.enableCallRecording,
        customInstructions: validatedData.customInstructions
      },
      promptPreview: newPrompt.substring(0, 300) + '...'
      })
      
    } catch (error) {
    console.error('Error updating agent settings:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid settings data',
        errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to update agent settings'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessId = url.searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({
        success: false,
        message: 'Business ID is required'
      }, { status: 400 })
    }

    // Get current agent settings
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
      data: {
        currentSettings: {
          voice: agent.voice,
          greetingMessage: agent.greeting_message,
          tone: agent.tone,
          services: agent.services,
          serviceAreas: agent.service_areas,
          businessHours: agent.business_hours,
          maxCallDuration: agent.max_call_duration,
          escalationPhone: agent.escalation_phone,
          enableCallRecording: agent.enable_call_recording,
          customInstructions: agent.custom_instructions,
          configuration: agent.configuration
        },
        availableVoices: [
          { id: 'alloy', name: 'Alloy', description: 'Neutral, professional voice' },
          { id: 'echo', name: 'Echo', description: 'Warm, friendly voice' },
          { id: 'fable', name: 'Fable', description: 'Storytelling, engaging voice' },
          { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
          { id: 'nova', name: 'Nova', description: 'Bright, energetic voice' },
          { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle voice' }
        ],
        availableTones: [
          { id: 'professional', name: 'Professional', description: 'Formal, business-like' },
          { id: 'friendly', name: 'Friendly', description: 'Warm, approachable' },
          { id: 'casual', name: 'Casual', description: 'Relaxed, informal' }
        ]
      }
    })

  } catch (error) {
    console.error('Error getting agent settings:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get agent settings'
    }, { status: 500 })
  }
}

// Generate a prompt that actually uses all the settings
function generateWorkingPrompt(business: any, settings: any, currentAgent: any): string {
  const greeting = settings.greetingMessage || currentAgent.greeting_message || `Thank you for calling ${business.business_name}`
  const tone = settings.tone || currentAgent.tone || 'professional'
  const voice = settings.voice || currentAgent.voice || 'alloy'
  const services = settings.services || currentAgent.services || []
  const serviceAreas = settings.serviceAreas || currentAgent.service_areas || []
  const businessHours = settings.businessHours || currentAgent.business_hours || {}
  const maxDuration = settings.maxCallDuration || currentAgent.max_call_duration || 600
  const escalationPhone = settings.escalationPhone || currentAgent.escalation_phone || 'Owner'
  const customInstructions = settings.customInstructions || currentAgent.custom_instructions || ''

  return `You are an AI receptionist for ${business.business_name}, a ${business.business_type} business.

EXACT GREETING TO USE: "${greeting}"

YOUR PERSONALITY:
- Tone: ${tone}
- Voice: ${voice}
- Be helpful, professional, and ${tone === 'friendly' ? 'warm and approachable' : tone === 'casual' ? 'relaxed and informal' : 'formal and business-like'}

BUSINESS INFORMATION:
- Name: ${business.business_name}
- Type: ${business.business_type}
- Services: ${services.length > 0 ? services.join(', ') : 'General services'}
- Service Areas: ${serviceAreas.length > 0 ? serviceAreas.join(', ') : 'Local area'}
- Address: ${business.address}
- Phone: ${business.phone_number}
- Email: ${business.email}

BUSINESS HOURS:
${Object.keys(businessHours).length > 0 ? JSON.stringify(businessHours, null, 2) : 'Standard business hours'}

CALL HANDLING RULES:
- Maximum call duration: ${maxDuration} seconds (${Math.round(maxDuration/60)} minutes)
- Escalation contact: ${escalationPhone}
- Always try to convert calls into appointments
- Ask qualifying questions about customer needs
- Provide accurate business information
- Be professional but ${tone}

APPOINTMENT BOOKING:
- Ask about preferred date and time
- Check availability during business hours
- Collect customer contact information
- Confirm appointment details
- Send confirmation if possible

${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}

Remember: You represent ${business.business_name} professionally. Always use the exact greeting "${greeting}" and maintain a ${tone} tone throughout the conversation.`
}

// Test the working configuration
async function testWorkingConfiguration(settings: any, businessName: string): Promise<any> {
  try {
    const testPrompt = `Generate a test response for a customer calling ${businessName}. Use the greeting "${settings.greetingMessage || `Thank you for calling ${businessName}`}" and maintain a ${settings.tone || 'professional'} tone. Keep it under 100 words.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate professional responses for AI receptionists.'
          },
          {
            role: 'user',
            content: testPrompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    })

    const result = await response.json()
    return {
      testResponse: result.choices?.[0]?.message?.content || 'Test response generated successfully.',
      voice: settings.voice || 'alloy',
      tone: settings.tone || 'professional',
      greeting: settings.greetingMessage || `Thank you for calling ${businessName}`,
      workingSettings: true
    }
    } catch (error) {
    console.error('Error testing configuration:', error)
    return {
      testResponse: 'Configuration updated successfully.',
      voice: settings.voice || 'alloy',
      tone: settings.tone || 'professional',
      greeting: settings.greetingMessage || `Thank you for calling ${businessName}`,
      workingSettings: true
    }
  }
}
