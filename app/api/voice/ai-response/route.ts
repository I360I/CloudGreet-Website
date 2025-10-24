import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { logger } from '@/lib/monitoring'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, businessName, businessType, services, hours } = await request.json()
    
    logger.info('Processing AI request', { message })

    const response = await openai.chat.completions.create({
      model: 'gpt-5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional AI receptionist for ${businessName || 'CloudGreet'}, a ${businessType || 'AI receptionist service'}. 

Business Details:
- Name: ${businessName || 'CloudGreet'}
- Type: ${businessType || 'AI Receptionist Service'}
- Services: ${services || 'AI phone answering, appointment scheduling, 24/7 support'}
- Hours: ${hours || '24/7'}

Instructions:
- Be helpful, friendly, and professional
- Keep responses concise and natural for voice conversation
- If asked about services, mention our AI phone answering and appointment scheduling
- If asked about pricing, mention our simple pricing: $200/month + $50 per booking
- If asked about hours, mention we're available 24/7
- Always end with asking how you can help them today
- Keep responses under 2 sentences for voice interaction`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    })

    const aiResponse = response.choices[0]?.message?.content || 'I apologize, I didn\'t catch that. How can I help you today?'

    logger.info('AI response generated', { response: aiResponse })

    return NextResponse.json({
      success: true,
      response: aiResponse
    })

  } catch (error: any) {
    logger.error('Error processing AI request', { error: error.message })
    return NextResponse.json({
      success: false,
      error: error.message,
      response: 'I apologize, I\'m having trouble right now. Please try again or call us directly.'
    }, { status: 500 })
  }
}
