import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        response: "I'm sorry, our AI system is currently being configured. Please try again later."
      }, { status: 503 })
    }

    const body = await request.json()
    const { message, context } = body

    if (!message) {
      return NextResponse.json({
        success: false,
        response: "I didn't receive your message. Could you please try again?"
      }, { status: 400 })
    }

    // Get authentication token from Authorization header
    const authHeader = request.headers.get('authorization')
    let businessInfo = null
    let agentConfig = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
      
      try {
        const decoded = jwt.verify(token, jwtSecret) as any
        const businessId = decoded.businessId

        // Get business information
        const { data: business, error: businessError } = await supabaseAdmin
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single()

        if (!businessError && business) {
          businessInfo = business

          // Get AI agent configuration
          const { data: agent, error: agentError } = await supabaseAdmin
            .from('ai_agents')
            .select('*')
            .eq('business_id', businessId)
            .single()

          if (!agentError && agent) {
            agentConfig = agent
          }
        }
      } catch (error) {
        // Token invalid, continue with demo mode
        logger.info('Invalid token for AI conversation, using demo mode')
      }
    }

    // Handle special start call message
    let systemPrompt = ''
    let aiResponse = ''

    if (message === 'start_call') {
      aiResponse = context?.greetingMessage || `Hello! Thank you for calling ${context?.businessName || 'our business'}. How can I help you today?`
    } else {
      // Build system prompt based on business info
      systemPrompt = `You are a professional AI receptionist for ${context?.businessName || businessInfo?.business_name || 'a service business'}.`

      if (businessInfo && agentConfig) {
        systemPrompt = `You are a professional AI receptionist for ${businessInfo.business_name}, a ${businessInfo.business_type || 'service'} business.

Business Information:
- Name: ${businessInfo.business_name}
- Type: ${businessInfo.business_type || 'Service Business'}
- Services: ${businessInfo.services?.join(', ') || 'General services'}
- Service Areas: ${businessInfo.service_areas?.join(', ') || 'Local area'}
- Business Hours: ${businessInfo.business_hours ? JSON.stringify(businessInfo.business_hours) : 'Standard business hours'}

AI Agent Configuration:
- Greeting: ${agentConfig.greeting_message || 'Hello! How can I help you today?'}
- Tone: ${agentConfig.tone || 'professional'}
- Voice: ${agentConfig.voice || 'professional'}
- Max Call Duration: ${agentConfig.max_call_duration || 10} minutes

Your responsibilities:
1. Answer questions about services and pricing professionally
2. Schedule appointments when requested
3. Take detailed messages for the business owner
4. Provide accurate contact information
5. Be helpful, professional, and friendly
6. Escalate complex issues appropriately

Important guidelines:
- Always be polite and professional
- Ask clarifying questions when needed
- Don't make promises about specific pricing without consulting the owner
- If you don't know something, say so and offer to have someone call back
- Keep responses conversational but informative
- End calls politely and confirm next steps`
      } else {
        systemPrompt += `

This is a demo conversation. You should:
1. Be professional and helpful
2. Answer general questions about service businesses
3. Ask clarifying questions
4. Offer to schedule appointments
5. Take messages professionally

Keep responses natural and conversational.`
      }

      // Generate AI response using OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })

      aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I'm having trouble processing that. Could you please try again?"
    }

    // Generate voice using OpenAI TTS
    const voice = context?.voice || agentConfig?.voice || 'alloy'
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as any,
      input: aiResponse,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    // Log the conversation for analytics
    if (businessInfo) {
      try {
        await supabaseAdmin
          .from('conversation_history')
          .insert({
            conversation_id: `demo-${Date.now()}`,
            business_id: businessInfo.id,
            customer_message: message,
            ai_response: aiResponse,
            created_at: new Date().toISOString()
          })
      } catch (error) {
        logger.error('Failed to log conversation', { error })
      }
    }

    // Return response with audio data as base64
    const base64Audio = buffer.toString('base64')
    
    return NextResponse.json({
      success: true,
      response: aiResponse,
      audioBlob: base64Audio,
      businessInfo: businessInfo ? {
        name: businessInfo.business_name,
        type: businessInfo.business_type
      } : null
    })

  } catch (error) {
    logger.error('AI conversation with voice error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      success: false,
      response: "I'm sorry, I'm experiencing technical difficulties. Please try again in a moment."
    }, { status: 500 })
  }
}
