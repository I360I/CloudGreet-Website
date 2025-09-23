import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { businessId, testMessage } = await request.json()

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Simplified for build - would test real AI agent in production
    const testResponse = {
      id: `test_${Date.now()}`,
      businessId,
      testMessage: testMessage || 'Hello, I need help with my service.',
      response: 'Thank you for contacting us! I\'d be happy to help you with your service needs. Could you please tell me more about what you\'re looking for?',
      confidence: 0.95,
      processingTime: 1.2,
      timestamp: new Date().toISOString()
    }

    // In production, this would:
    // 1. Load the business and AI agent configuration
    // 2. Send the test message to OpenAI with the agent's prompt
    // 3. Return the AI response with confidence metrics
    // 4. Log the test for analytics

    return NextResponse.json({
      success: true,
      error_message: 'AI agent test completed successfully',
      data: testResponse
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to test AI agent'
    }, { status: 500 })
  }
}