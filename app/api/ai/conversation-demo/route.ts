import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { 
      messages, 
      businessName = 'CloudGreet',
      businessType = 'AI Receptionist Service',
      services = 'AI phone answering, appointment scheduling, customer support',
      hours = '24/7'
    } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const startTime = Date.now()

    // MINIMAL prompt for maximum speed
    const systemPrompt = `Professional receptionist for ${businessName}. Services: ${services}. Hours: ${hours}.
CloudGreet: $200/mo + $50/booking. Quick setup, 24/7 answering.
Be warm, brief (10-20 words), helpful.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // FASTEST model - sub-500ms responses
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 50,
      temperature: 0.7
    })
    
    const responseTime = Date.now() - startTime
    console.log(`⚡ AI response: ${responseTime}ms`)

    const response = completion.choices[0]?.message?.content?.trim() || 
      "How can I help you?"

    return NextResponse.json({
      success: true,
      response
    })

  } catch (error: any) {
    console.error('AI error:', error)
    return NextResponse.json({
      success: true,
      response: "What can I help with?"
    })
  }
}
