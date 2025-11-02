import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { call_id, session_id, from_number, to_number } = body

    console.log('Realtime stream request:', { call_id, session_id, from_number, to_number })

    // Create a new Realtime API session with the latest model
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      instructions: `You are CloudGreet's AI receptionist. You are professional, helpful, and focused on qualifying leads and booking appointments. 

      Your goals:
      1. Greet the caller warmly
      2. Ask about their service needs  
      3. Qualify them as a lead
      4. Offer to book an appointment
      5. Collect their contact information
      
      Keep responses conversational and under 30 seconds. Be direct and professional.`,
      tools: [
        {
          type: 'function',
          name: 'book_appointment',
          description: 'Book an appointment for the caller',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Caller name' },
              phone: { type: 'string', description: 'Caller phone number' },
              email: { type: 'string', description: 'Caller email' },
              service: { type: 'string', description: 'Service needed' },
              preferred_date: { type: 'string', description: 'Preferred appointment date' },
              preferred_time: { type: 'string', description: 'Preferred appointment time' }
            },
            required: ['name', 'phone', 'service']
          }
        }
      ]
    })

    // Return the session information for the webhook to use
    return NextResponse.json({
      success: true,
      call_id,
      // @ts-ignore - OpenAI Realtime API response type may vary
      session_id: (session as any).id,
      message: 'Realtime session created successfully'
    })

  } catch (error) {
    console.error('Realtime stream error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create realtime session'
    }, { status: 500 })
  }
}