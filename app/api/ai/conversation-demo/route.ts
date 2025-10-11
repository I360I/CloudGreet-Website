import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Cache for common questions - instant responses
const quickResponses: { [key: string]: string } = {
  'hours': 'We\'re open {hours}. When works for you?',
  'services': '{services}. What do you need?',
  'pricing': '$200/month plus $50 per booking. Sound good?',
  'cost': '$200/month plus $50 per booking. Want to try it?',
  'setup': '5-minute signup, test it, go live. Super easy!',
  'how': 'Quick signup, we create your AI, you test it, then go live!',
}

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
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Check for quick response match
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''
    for (const [keyword, template] of Object.entries(quickResponses)) {
      if (lastMessage.includes(keyword)) {
        const response = template
          .replace('{hours}', hours)
          .replace('{services}', services)
        console.log(`⚡ INSTANT response (cached): ${response}`)
        return NextResponse.json({ success: true, response })
      }
    }

    const start = Date.now()

    // Optimized minimal prompt for GPT-3.5-turbo
    const systemPrompt = `You're a friendly receptionist for ${businessName} (${businessType}).
Services: ${services}
Hours: ${hours}
CloudGreet: $200/mo + $50 per booking, 24/7 AI answering

Style: Professional, warm, brief (15-20 words). Be helpful and conversational.

Examples:
"What services?" → "${services}. What do you need?"
"Hours?" → "${hours}. When works for you?"
"How much?" → "$200/mo + $50 per booking. Want details?"

Answer naturally and briefly.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-6) // Only keep last 3 exchanges for speed
      ],
      max_tokens: 50,
      temperature: 0.7
    })
    
    console.log(`⚡ AI: ${Date.now() - start}ms`)

    const response = completion.choices[0]?.message?.content?.trim() || 
      "How can I help you?"

    return NextResponse.json({ success: true, response })

  } catch (error: any) {
    console.error('AI error:', error)
    return NextResponse.json({
      success: true,
      response: "What can I help with?"
    })
  }
}
