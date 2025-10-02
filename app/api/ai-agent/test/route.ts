import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
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
    const { testMessage, testScenario } = body

    // Get AI agent configuration
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

    // Create test conversation
    const systemPrompt = agent.prompt_template || `You are an AI assistant for ${business.business_name}.`
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: testMessage || 'Hello, I need help with your services.' }
    ]

    // Test the AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages as any,
      max_tokens: 500,
      temperature: 0.7
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
      model: 'gpt-4',
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 300,
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
      error: error instanceof Error ? error.message : 'Unknown error', 
      requestId,
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id'),
      duration: Date.now() - startTime
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to test AI agent'
    }, { status: 500 })
  }
}
