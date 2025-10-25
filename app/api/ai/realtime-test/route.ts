import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { message, businessId } = await request.json()

    if (!message || !businessId) {
      return NextResponse.json({ 
        error: 'Message and business ID are required' 
      }, { status: 400 })
    }

    // Get business and AI agent configuration
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ 
        error: 'Business not found' 
      }, { status: 404 })
    }

    const agent = business.ai_agents
    const businessName = business.business_name || 'CloudGreet'
    const businessType = business.business_type || 'AI Receptionist Service'
    const services = agent?.configuration?.services || business.services || ['General Services']
    const hours = agent?.configuration?.hours || business.business_hours || '24/7'
    const voice = agent?.configuration?.voice || 'alloy'

    // Use real-time AI model for testing
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-realtime-preview-2025-10-25',
      messages: [
        {
          role: 'system',
          content: `You are ${businessName}'s AI receptionist - a professional, helpful assistant for a ${businessType} business.

BUSINESS DETAILS:
- Company: ${businessName}
- Type: ${businessType}
- Services: ${services.join(', ')}
- Hours: ${hours}

INSTRUCTIONS:
- Be warm, professional, and helpful
- Keep responses brief for phone calls (under 20 words)
- If they want to book an appointment, say "I'd be happy to book that for you!"
- Ask for their name and phone number if booking
- Be conversational and natural
- If they ask about services, mention ${services.join(', ')}
- If they ask about hours, say "${hours}"

This is a real-time phone conversation. Respond naturally and helpfully.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 50,
      temperature: 0.7
    })

    const aiResponse = response.choices[0]?.message?.content || 'Hello! How can I help you today?'

    // Generate speech using the configured voice
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: aiResponse,
      response_format: 'mp3'
    })

    const audioBuffer = Buffer.from(await speech.arrayBuffer())

    // Log the conversation
    await supabaseAdmin
      .from('conversation_history')
      .insert({
        conversation_id: `test-${Date.now()}`,
        business_id: businessId,
        customer_message: message,
        ai_response: aiResponse,
        created_at: new Date().toISOString()
      })

    logger.info('Real-time AI test completed', { 
      businessId, 
      businessName,
      message: message.substring(0, 50),
      aiResponse: aiResponse.substring(0, 50)
    })

    return NextResponse.json({
      success: true,
      response: aiResponse,
      businessInfo: {
        name: businessName,
        type: businessType,
        services,
        hours,
        voice
      },
      realtimeModel: 'gpt-4o-realtime-preview-2025-10-25',
      audioData: audioBuffer.toString('base64')
    })

  } catch (error: any) {
    logger.error('Real-time AI test error', { 
      error: error.message
    })
    
    return NextResponse.json({ 
      error: 'Real-time AI test failed',
      details: error.message 
    }, { status: 500 })
  }
}
