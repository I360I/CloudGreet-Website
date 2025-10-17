import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'
import { z } from 'zod'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const voiceCustomizationSchema = z.object({
  businessId: z.string().uuid(),
  voiceSettings: z.object({
    voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']),
    speed: z.number().min(0.5).max(2.0).optional(),
    pitch: z.number().min(0.5).max(2.0).optional(),
    language: z.string().default('en'),
    accent: z.string().optional()
  }),
  personalitySettings: z.object({
    tone: z.enum(['professional', 'friendly', 'casual', 'enthusiastic']),
    personality: z.string().optional(),
    responseStyle: z.enum(['concise', 'detailed', 'conversational']),
    humorLevel: z.number().min(0).max(10).optional()
  }),
  businessSettings: z.object({
    greetingMessage: z.string().min(10).max(200),
    closingMessage: z.string().min(10).max(200).optional(),
    holdMessage: z.string().min(10).max(200).optional(),
    businessHours: z.record(z.string(), z.any()).optional()
  })
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
    const validatedData = voiceCustomizationSchema.parse(body)
    
    // Verify user owns this business
    if (userBusinessId !== validatedData.businessId) {
      return NextResponse.json({ error: 'Unauthorized - Access denied' }, { status: 403 })
    }

    // Get business data
    const { data: business, error: businessError} = await supabaseAdmin
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

    // Get AI agent
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

    // Generate personalized prompt with new settings
    const personalizedPrompt = await generatePersonalizedPrompt(
      business,
      validatedData.voiceSettings,
      validatedData.personalitySettings,
      validatedData.businessSettings
    )

    // Update agent in database
    const updateData = {
      voice: validatedData.voiceSettings.voice,
      tone: validatedData.personalitySettings.tone,
      greeting_message: validatedData.businessSettings.greetingMessage,
      prompt_template: personalizedPrompt,
      configuration: {
        voice: validatedData.voiceSettings,
        personality: validatedData.personalitySettings,
        business: validatedData.businessSettings,
        openai_model: 'gpt-4',
        max_tokens: 150,
        temperature: 0.7
      },
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('ai_agents')
      .update(updateData)
      .eq('id', agent.id)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    // Update Telnyx voice settings if agent has Telnyx ID
    if (agent.telnyx_agent_id) {
      try {
        const telnyxUpdate = {
          voice: validatedData.voiceSettings.voice,
          language: validatedData.voiceSettings.language,
          speech_rate: validatedData.voiceSettings.speed || 1.0,
          instructions: personalizedPrompt
        }

        const telnyxResponse = await fetch(`https://api.telnyx.com/v2/ai_agents/${agent.telnyx_agent_id}`, {
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

    // Test the new voice configuration
    const testResponse = await testVoiceConfiguration(
      validatedData.voiceSettings,
      validatedData.personalitySettings,
      business.business_name
    )

    return NextResponse.json({
      success: true,
      message: 'Voice customization updated successfully',
      data: {
        agentId: agent.id,
        voiceSettings: validatedData.voiceSettings,
        personalitySettings: validatedData.personalitySettings,
        testResponse: testResponse
      }
    })

  } catch (error) {
    logger.error('Voice customization failed', { error: error instanceof Error ? error.message : 'Unknown error', endpoint: 'voice/customize' })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid voice customization data',
        errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to customize voice settings'
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

    // Get current voice settings
    const { data: agent, error } = await supabaseAdmin
      .from('ai_agents')
      .select('voice, tone, greeting_message, configuration')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single()

    if (error || !agent) {
      return NextResponse.json({
        success: false,
        message: 'AI agent not found'
      }, { status: 404 })
    }

    // Get available voice options
    const availableVoices = [
      { id: 'alloy', name: 'Alloy', description: 'Neutral, professional voice' },
      { id: 'echo', name: 'Echo', description: 'Warm, friendly voice' },
      { id: 'fable', name: 'Fable', description: 'Storytelling, engaging voice' },
      { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
      { id: 'nova', name: 'Nova', description: 'Bright, energetic voice' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle voice' }
    ]

    return NextResponse.json({
      success: true,
      data: {
        currentSettings: {
          voice: agent.voice,
          tone: agent.tone,
          greetingMessage: agent.greeting_message,
          configuration: agent.configuration
        },
        availableVoices,
        personalityOptions: [
          { id: 'professional', name: 'Professional', description: 'Formal, business-like' },
          { id: 'friendly', name: 'Friendly', description: 'Warm, approachable' },
          { id: 'casual', name: 'Casual', description: 'Relaxed, informal' },
          { id: 'enthusiastic', name: 'Enthusiastic', description: 'Energetic, excited' }
        ]
      }
    })

  } catch (error) {
    logger.error('Failed to get voice settings', { error: error instanceof Error ? error.message : 'Unknown error', endpoint: 'voice/customize' })
    return NextResponse.json({
      success: false,
      message: 'Failed to get voice settings'
    }, { status: 500 })
  }
}

async function generatePersonalizedPrompt(
  business: any,
  voiceSettings: any,
  personalitySettings: any,
  businessSettings: any
): Promise<string> {
  try {
    const prompt = `Create a personalized AI receptionist prompt for ${business.business_name}, a ${business.business_type} business.

Business Details:
- Name: ${business.business_name}
- Type: ${business.business_type}
- Services: ${business.services?.join(', ') || 'General services'}
- Address: ${business.address}
- Phone: ${business.phone_number}

Voice Settings:
- Voice: ${voiceSettings.voice}
- Language: ${voiceSettings.language}
- Speed: ${voiceSettings.speed || 1.0}

Personality Settings:
- Tone: ${personalitySettings.tone}
- Personality: ${personalitySettings.personality || 'Helpful and knowledgeable'}
- Response Style: ${personalitySettings.responseStyle}
- Humor Level: ${personalitySettings.humorLevel || 5}/10

Business Settings:
- Greeting: ${businessSettings.greetingMessage}
- Closing: ${businessSettings.closingMessage || 'Thank you for calling. Have a great day!'}
- Hold Message: ${businessSettings.holdMessage || 'Please hold while I assist you.'}

Create a comprehensive prompt that:
1. Defines the AI's role and personality
2. Includes business-specific information
3. Sets conversation guidelines
4. Includes appointment booking instructions
5. Handles common customer inquiries
6. Maintains the specified tone and personality

Make it professional yet ${personalitySettings.tone}, and ensure it represents ${business.business_name} well.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating AI receptionist prompts for service businesses. Create detailed, professional prompts that help AI assistants provide excellent customer service.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7
    })

    return response.choices[0].message.content || ''
  } catch (error) {
    logger.error('Failed to generate personalized prompt', { error: error instanceof Error ? error.message : 'Unknown error', endpoint: 'voice/customize' })
    // Fallback to basic prompt
    return `You are an AI receptionist for ${business.business_name}, a ${business.business_type} business. 

Your role:
- Answer calls professionally with a ${personalitySettings.tone} tone
- Qualify leads by asking about their needs
- Schedule appointments when appropriate
- Provide business information
- Transfer to human when needed

Business details:
- Name: ${business.business_name}
- Type: ${business.business_type}
- Services: ${business.services?.join(', ') || 'General services'}
- Hours: ${JSON.stringify(businessSettings.businessHours || {})}
- Phone: ${business.phone_number}
- Address: ${business.address}

Greeting: ${businessSettings.greetingMessage}

Always be professional, helpful, and try to convert calls into appointments.`
  }
}

async function testVoiceConfiguration(
  voiceSettings: any,
  personalitySettings: any,
  businessName: string
): Promise<string> {
  try {
    const testPrompt = `Generate a test greeting for ${businessName} using a ${personalitySettings.tone} tone with the ${voiceSettings.voice} voice. Keep it under 50 words.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Generate short, professional greetings for AI receptionists.'
        },
        {
          role: 'user',
          content: testPrompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7
    })

    return response.choices[0].message.content || 'Test greeting generated successfully.'
  } catch (error) {
    logger.error('Failed to test voice configuration', { error: error instanceof Error ? error.message : 'Unknown error', endpoint: 'voice/customize' })
    return 'Voice configuration updated successfully.'
  }
}
