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

    console.log('✅ Calling GPT-4 for conversation...')

    // ULTRA-LEAN system prompt for maximum speed
    const systemPrompt = `You're the receptionist for ${businessName} (${businessType}). Services: ${services}. Hours: ${hours}.

RULES:
- 5-10 words MAX per response
- Super casual: "Yeah!", "Cool!", "For sure!"
- Use: um, like, so, totally
- NO formal language

EXAMPLES:
"What services?" → "AC repair, heating, maintenance!"
"Your hours?" → "${hours}!"  
"How much?" → "Just $200/mo plus $50 per booking!"
"How's it work?" → "Sign up, test it, go live in 10 mins!"

Be friendly, brief, human.`

    const startTime = Date.now()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fastest model
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 25, // VERY short for speed
      temperature: 0.9, // High but not max for consistency
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    })
    
    const responseTime = Date.now() - startTime
    console.log(`⚡ GPT-4o-mini response time: ${responseTime}ms (should be <1000ms)`)

    const response = completion.choices[0]?.message?.content?.trim() || 
      "Hey! I'm here to help. What do you need?"

    console.log('✅ GPT-4 response:', response.substring(0, 50) + '...')

    return NextResponse.json({
      success: true,
      response
    })

  } catch (error: any) {
    console.error('Conversation error:', error)
    
    // Friendly fallback response
    return NextResponse.json({
      success: true,
      response: "Hey! I'm having a tiny tech hiccup. Can you repeat that for me?"
    })
  }
}

