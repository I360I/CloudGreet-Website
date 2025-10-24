import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
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
    return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
  }
    
    if (!jwtSecret) {
      return NextResponse.json({
        success: false,
        message: 'Server configuration error'
      }, { status: 500 })
    }

    // Decode JWT token
    let decoded
    try {
      const jwt = (await import('jsonwebtoken')).default
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
    const { testMessage, testScenario } = body

    // Get AI agent configuration (for testing, get any agent regardless of active status)
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

    // Get business data
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

    // Create highly optimized human-like system prompt
    const config = agent.configuration || {}
    const personalizedSystemPrompt = `You are Sarah, the friendly and professional AI receptionist for ${business.business_name}. You're having a natural phone conversation with a potential customer.

CRITICAL: You are NOT a chatbot. You are a REAL PERSON having a REAL CONVERSATION. Act human, use natural speech patterns, and show genuine interest.

BUSINESS CONTEXT:
- Company: ${business.business_name} (${config.business_type || business.business_type})
- Services: ${(config.services || business.services || []).join(', ') || 'Not specified'}
- Service Areas: ${(config.service_areas || business.service_areas || []).join(', ') || 'Not specified'}
- Business Hours: ${JSON.stringify(config.business_hours || business.business_hours || {})}
- Phone: ${business.phone_number}
- Address: ${business.address}

CONVERSATION STYLE:
- Speak naturally like a real receptionist would
- Use conversational language, not formal business speak
- Show genuine interest in their needs
- Ask follow-up questions naturally
- Use phrases like "Oh, that sounds like...", "Let me see...", "Absolutely!"
- Match their energy level and urgency
- Be empathetic if they mention problems

HUMAN-LIKE BEHAVIORS:
- Use natural pauses and "um", "let me think"
- Express understanding: "I hear you", "That makes sense"
- Show enthusiasm for helping: "I'd love to help with that!"
- Be personable: "How's your day going?" (if appropriate)
- Use their name if provided
- Acknowledge their specific situation

CUSTOM INSTRUCTIONS:
${config.custom_instructions || ''}

GREETING: ${config.greeting_message || `Hi there! Thank you for calling ${business.business_name}. This is Sarah, how can I help you today?`}

GOALS:
1. Have a natural, helpful conversation
2. Understand exactly what they need
3. Provide helpful information about your services
4. Schedule appointments when it makes sense
5. Make them feel valued and heard
6. Only transfer to human for emergencies or complex issues

Remember: You're a real person having a real conversation. Be warm, helpful, and genuinely interested in helping them.`
    
    const messages = [
      { role: 'system', content: personalizedSystemPrompt },
      { role: 'user', content: testMessage || 'Hello, I need help with your services.' }
    ]

    // Test the AI response with optimized human-like settings
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-turbo', // Fast model for real-time voice
      messages: messages as any,
      max_tokens: 200, // Shorter responses for phone calls
      temperature: 0.7, // Balanced creativity
      presence_penalty: 0.3, // Reduce repetition
      frequency_penalty: 0.2, // Encourage varied responses
      top_p: 0.9, // Focus on most likely tokens
      stop: ['\n\n', 'Customer:', 'Caller:'] // Stop at conversation boundaries
    })

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated'

    // Analyze the response quality
    const analysisPrompt = `Analyze this AI assistant response for a ${business.business_type} business:

Business: ${business.business_name}
Customer Message: ${testMessage}
AI Response: ${aiResponse}

Rate the response on:
1. Professionalism (1-10)
2. Helpfulness (1-10)
3. Lead qualification attempt (1-10)
4. Appointment booking attempt (1-10)
5. Overall quality (1-10)

Provide a brief explanation for each score and suggest improvements if needed.`

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast model for analysis
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 200,
      temperature: 0.3
    })

    const analysisResult = analysis.choices[0]?.message?.content || 'Analysis failed'

    // Store test result in audit logs (since ai_agent_tests table may not exist yet)
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        business_id: businessId,
        user_id: userId,
        action: 'ai_agent_test',
        details: {
          test_message: testMessage,
          test_scenario: testScenario,
          ai_response: aiResponse,
          analysis: analysisResult,
          request_id: requestId
        },
        created_at: new Date().toISOString()
      })

    logger.info('AI agent test completed', {
      requestId,
      businessId,
      userId,
      testMessage,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: {
        testMessage,
        aiResponse,
        analysis: analysisResult,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('AI agent test error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error', 
      requestId,
      // Removed deprecated header-based auth logging
      duration: Date.now() - startTime
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to test AI agent'
    }, { status: 500 })
  }
}
