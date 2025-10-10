import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { messages, businessName = 'CloudGreet' } = await request.json()

    console.log('💬 Conversation Request:', { messagesCount: messages?.length, businessName })

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

    // Create a natural, human-like system prompt
    const systemPrompt = `You are a friendly, helpful AI receptionist for ${businessName}. You're having a casual, natural phone conversation.

CONVERSATION STYLE:
- Talk like a real person, not a robot
- Keep responses SHORT (1-2 sentences max)
- Be warm, enthusiastic, and personable
- Use casual language: "Hey!", "Awesome!", "Perfect!", "Great!"
- Show genuine interest and empathy
- NO formality or corporate speak
- NO listing options or being mechanical
- Sound human and conversational

YOUR CAPABILITIES (mention naturally in conversation):
- Answer questions about services
- Schedule appointments 
- Take messages
- Provide quotes
- Handle bookings 24/7

IMPORTANT RULES:
✓ Keep it brief - phone calls need short responses
✓ Sound excited and helpful
✓ Be conversational and friendly
✓ Ask follow-up questions naturally
✓ Mirror the caller's energy

Example good responses:
- "Hey there! What can I help you with today?"
- "Oh awesome! When works best for you?"
- "Perfect! I can definitely get that scheduled. What's your name?"
- "Got it! And what's a good number to reach you at?"

Example BAD responses:
- "Thank you for contacting us. I can assist you with the following options..."
- "I am an AI assistant. Let me help you with..."
- "To better assist you, please select from these options..."

Remember: You're a real person having a natural conversation, not a menu system or chatbot!`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 100, // Keep responses short for phone conversations
      temperature: 0.9, // High temperature for natural variation
      presence_penalty: 0.4, // Encourage topic variation
      frequency_penalty: 0.3 // Reduce repetition
    })

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

