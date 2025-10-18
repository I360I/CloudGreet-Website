import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { message, businessName, businessType, services, hours } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Create the system prompt for the AI
    const systemPrompt = `You are a professional AI receptionist for ${businessName}, a ${businessType} company. 

Company Details:
- Business Name: ${businessName}
- Business Type: ${businessType}
- Services: ${services}
- Business Hours: ${hours}

Instructions:
- Be helpful, friendly, and professional
- Keep responses concise and natural for voice conversation
- Answer questions about services, pricing, hours, and appointments
- If you don't know something, offer to connect them with the team
- Always be ready to help with scheduling or questions
- Keep responses under 2 sentences for voice interaction`

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 })
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I cannot process your request right now.'

    return NextResponse.json({ 
      response: aiResponse,
      success: true 
    })

  } catch (error: any) {
    console.error('❌ AI chat error:', error)
    return NextResponse.json({ 
      error: error.message,
      success: false 
    }, { status: 500 })
  }
}
