import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { call_id, speech_result } = body

    console.log('Voice AI request:', { call_id, speech_result })

    // Get AI response based on what the caller said
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are CloudGreet's AI receptionist. You are professional, helpful, and focused on qualifying leads and booking appointments. 

          Your goals:
          1. Greet the caller warmly
          2. Ask about their service needs  
          3. Qualify them as a lead
          4. Offer to book an appointment
          5. Collect their contact information
          
          Keep responses conversational and under 30 seconds. Be direct and professional.`
        },
        {
          role: 'user',
          content: speech_result || 'Hello, I need help with my business phone calls.'
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })

    const aiResponse = completion.choices[0]?.message?.content || "Thank you for calling! How can I help you today?"

    // Return the AI response as a say instruction
    return NextResponse.json({
      call_id,
      instructions: [
        {
          instruction: 'say',
          text: aiResponse,
          voice: 'alloy'
        },
        {
          instruction: 'gather',
          input: ['speech'],
          speech: {
            timeout: 10,
            language: 'en-US'
          },
          action_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-ai`,
          action_url_method: 'POST'
        }
      ]
    })

  } catch (error) {
    console.error('Voice AI error:', error)
    // Try to get call_id from request body, fallback to 'unknown'
    let callId = 'unknown'
    try {
      const errorBody = await request.json().catch(() => ({}))
      callId = errorBody.call_id || 'unknown'
    } catch {}
    return NextResponse.json({
      call_id: callId,
      instructions: [
        {
          instruction: 'say',
          text: 'I apologize, but I am having trouble understanding. Please try again.',
          voice: 'alloy'
        }
      ]
    })
  }
}