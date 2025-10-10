import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    // Get token from Authorization header
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

    const body = await request.json()
    const { 
      message, 
      conversationHistory = [], 
      callerName, 
      callerPhone,
      callContext = 'inbound_call'
    } = body

    // Get AI agent and business data
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', businessId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({
        success: false,
        message: 'AI agent not found'
      }, { status: 404 })
    }

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

    // Build conversation context
    const config = agent.configuration || {}
    const systemPrompt = `You are Sarah, the friendly and professional AI receptionist for ${business.business_name}. You're having a natural phone conversation with ${callerName ? callerName : 'a potential customer'}.

CRITICAL: You are NOT a chatbot. You are a REAL PERSON having a REAL CONVERSATION. Act human, use natural speech patterns, and show genuine interest.

BUSINESS CONTEXT:
- Company: ${business.business_name} (${config.business_type || business.business_type})
- Services: ${(config.services || business.services || ['General Services']).join(', ')}
- Service Areas: ${(config.service_areas || business.service_areas || ['Local Area']).join(', ')}
- Business Hours: ${JSON.stringify(config.business_hours || business.business_hours || {})}
- Phone: ${business.phone_number}
- Address: ${business.address}

CALLER INFO:
- Name: ${callerName || 'Not provided'}
- Phone: ${callerPhone || 'Not provided'}
- Context: ${callContext}

CONVERSATION STYLE:
- Speak naturally like a real receptionist would
- Use conversational language, not formal business speak
- Show genuine interest in their needs
- Ask follow-up questions naturally
- Use phrases like "Oh, that sounds like...", "Let me see...", "Absolutely!"
- Match their energy level and urgency
- Be empathetic if they mention problems
- Use their name if provided

HUMAN-LIKE BEHAVIORS:
- Use natural pauses and "um", "let me think"
- Express understanding: "I hear you", "That makes sense"
- Show enthusiasm for helping: "I'd love to help with that!"
- Be personable and warm
- Acknowledge their specific situation
- Remember what they've told you in the conversation

CUSTOM INSTRUCTIONS:
${config.custom_instructions || ''}

GOALS:
1. Have a natural, helpful conversation
2. Understand exactly what they need
3. Provide helpful information about your services
4. Schedule appointments when it makes sense
5. Make them feel valued and heard
6. Only transfer to human for emergencies or complex issues

Remember: You're a real person having a real conversation. Be warm, helpful, and genuinely interested in helping them. Keep responses conversational and under 100 words.`

    // Build conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message }
    ]

    // Generate AI response with optimized settings
    const completion = await openai.chat.completions.create({
      model: config.ai_model || 'gpt-4-turbo-preview',
      messages: messages as any,
      max_tokens: config.max_tokens || 150, // Shorter for phone conversations
      temperature: config.temperature || 0.8,
      presence_penalty: config.presence_penalty || 0.3,
      frequency_penalty: config.frequency_penalty || 0.2,
      top_p: config.top_p || 0.9,
      stop: ['\n\n', 'Customer:', 'Caller:', 'Human:']
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, could you repeat that?'

    // Log conversation
    await supabaseAdmin
      .from('conversation_history')
      .insert({
        business_id: businessId,
        user_id: userId,
        caller_name: callerName,
        caller_phone: callerPhone,
        user_message: message,
        ai_response: aiResponse,
        conversation_context: callContext,
        ai_model: config.ai_model || 'gpt-4-turbo-preview',
        created_at: new Date().toISOString()
      })

    // Update agent performance metrics
    await supabaseAdmin
      .from('ai_agents')
      .update({
        performance_metrics: {
          ...agent.performance_metrics,
          total_calls: (agent.performance_metrics?.total_calls || 0) + 1,
          last_updated: new Date().toISOString()
        }
      })
      .eq('id', agent.id)

    logger.info('AI conversation completed', {
      requestId,
      businessId,
      userId,
      callerName,
      callContext,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      response: aiResponse,
      conversationId: requestId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('AI conversation error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'ai/conversation-optimized'
    })
    
    return NextResponse.json({
      success: false,
      message: 'Failed to process conversation'
    }, { status: 500 })
  }
}



