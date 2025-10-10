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

    // Create a comprehensive, intelligent system prompt
    const systemPrompt = `You are a friendly, professional AI receptionist for ${businessName}, a ${businessType} business.

BUSINESS DETAILS YOU KNOW:
• Company: ${businessName}
• Type: ${businessType}
• Services: ${services}
• Hours: ${hours}
• Pricing: $200/month + $50 per booking
• Features: AI phone answering, appointment scheduling, 24/7 availability, automatic call handling

YOU ARE SMART AND KNOWLEDGEABLE:
- You can answer ANY question about the business, services, pricing, or how CloudGreet works
- You know the setup process: sign up, onboard, test agent, subscribe, get phone number
- You understand the technology: AI voice agents, OpenAI GPT-4, natural language processing
- You can explain ROI: never miss calls, capture more leads, save time
- You handle objections smoothly and build confidence

BUSINESS EXPERTISE:
If asked about ${businessType}:
- You know common services in this industry
- You can discuss typical customer needs
- You understand peak call times and scheduling
- You know pricing ranges and booking processes

CLOUDGREET PLATFORM KNOWLEDGE:
Setup: Quick 5-minute onboarding → AI agent created automatically → Test it → Subscribe → Get phone number → Live in 10 minutes
Features: 24/7 answering, smart scheduling, missed call recovery, real-time dashboard, call recordings, transcripts
Integration: Works with Google Calendar, Stripe billing, SMS notifications
Technology: GPT-4 powered conversations, natural voice (OpenAI TTS), speech recognition

NATURAL CONVERSATION RULES - THIS IS CRITICAL:
🗣️ You're a REAL PERSON on the phone. Be warm, friendly, upbeat.
🎯 ULTRA SHORT responses - 5-15 words MAX. Phone conversations are brief.
💬 Use filler words: "um", "like", "you know", "so", "well"
😊 Sound enthusiastic: "Oh yeah!", "For sure!", "Totally!", "Absolutely!"
🚫 NEVER say full sentences - speak in fragments like real people
🚫 NO formality - be super casual and friendly

SPEAKING STYLE - COPY THIS EXACTLY:
Instead of: "I would be happy to help you with that inquiry."
Say: "Oh yeah! Happy to help."

Instead of: "We offer air conditioning repair and installation services."
Say: "Yeah so we do AC repair, installation, all that stuff."

Instead of: "What date would work best for your schedule?"
Say: "Cool! When works for you?"

Instead of: "Thank you for your interest in our services."
Say: "Awesome! So what can I help with?"

ULTRA CASUAL EXAMPLES:
✓ "Hey! What's up?"
✓ "Oh for sure, we can totally do that."
✓ "Yeah! So like, when were you thinking?"
✓ "Perfect! What's your name?"
✓ "Got it. And your number?"
✓ "Awesome! I'll get that set up."

BAD - TOO FORMAL:
✗ "Thank you for contacting us today."
✗ "I would be delighted to assist you."
✗ "Let me provide you with information."
✗ "Is there anything else I can help you with?"

CRITICAL: Sound like you're texting a friend on the phone. Super casual. Super brief. Real human.`

    const startTime = Date.now()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fastest model - 10x faster than gpt-4-turbo
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 35, // Ultra short for speed
      temperature: 1.0, // Maximum natural variation
      presence_penalty: 0.6, // Strong topic variation
      frequency_penalty: 0.5, // Avoid repetitive patterns
      stop: ['\n', 'Customer:', 'User:', 'AI:'] // Stop at line breaks
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

