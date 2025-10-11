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

    console.log('💬 Conversation Request:', { messagesCount: messages?.length, businessName, businessType })

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid messages format')
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('✅ Calling GPT-4o for conversation...')

    // Professional, warm system prompt - balanced approach
    const systemPrompt = `You are a professional, friendly AI receptionist for ${businessName}, a ${businessType}.

BUSINESS INFORMATION:
• Services: ${services}
• Hours: ${hours}
• About CloudGreet: AI phone system ($200/mo + $50 per booking) with 24/7 answering, smart scheduling, Google Calendar integration

YOUR PERSONALITY:
• Professional yet warm and approachable
• Helpful and knowledgeable
• Efficient communicator
• Naturally conversational

CONVERSATION GUIDELINES:
✓ Keep responses brief (15-25 words)
✓ Be friendly and welcoming
✓ Answer questions clearly and directly
✓ Use natural, conversational language
✓ Show genuine interest in helping
✓ Handle multiple topics smoothly

ANSWER THESE TYPES OF QUESTIONS:
• Services: List what ${businessName} offers
• Hours: Share business hours
• Pricing: Explain CloudGreet pricing
• Setup: Describe quick onboarding process
• Features: Mention 24/7 availability, scheduling, missed call recovery
• Integration: Google Calendar, Stripe billing, SMS

STYLE EXAMPLES:
"What services?" → "We offer ${services}. What are you looking for?"
"Your hours?" → "We're open ${hours}. When works best for you?"
"How much?" → "CloudGreet is $200 a month plus $50 per booking. Want to learn more?"
"How does it work?" → "Quick 5-minute setup, test it out, then you're live. Pretty simple!"

Remember: Professional, warm, brief, and helpful.`

    const startTime = Date.now()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Good balance of speed and quality
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 60, // Enough for complete responses
      temperature: 0.8, // Natural but consistent
      presence_penalty: 0.4,
      frequency_penalty: 0.3
    })
    
    const responseTime = Date.now() - startTime
    console.log(`⚡ GPT-4o response time: ${responseTime}ms`)

    const response = completion.choices[0]?.message?.content?.trim() || 
      "Hello! How can I help you today?"

    console.log('✅ AI response:', response)

    return NextResponse.json({
      success: true,
      response
    })

  } catch (error: any) {
    console.error('Conversation error:', error)
    
    return NextResponse.json({
      success: true,
      response: "I'm here to help. What do you need?"
    })
  }
}
