import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract call information from Telnyx webhook
    const callId = body.data?.payload?.call_control_id || body.call_control_id
    const fromNumber = body.data?.payload?.from || body.from
    const toNumber = body.data?.payload?.to || body.to
    const eventType = body.data?.event_type || body.event_type

    console.log('Telnyx webhook received:', { callId, fromNumber, toNumber, eventType })

    // Handle different event types
    if (eventType === 'call.answered') {
      // Create real AI conversation session
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
        
        Keep responses conversational and under 30 seconds. Be direct and professional.`
      })

      return NextResponse.json({
        call_id: callId,
        status: 'answered',
        instructions: [
          {
            instruction: 'stream_audio',
            stream_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/realtime-stream`,
            stream_url_method: 'POST',
            stream_url_payload: {
              call_id: callId,
              // @ts-ignore - OpenAI Realtime API response type may vary
              session_id: (session as any).id,
              from_number: fromNumber,
              to_number: toNumber
            }
          },
          {
            instruction: 'record',
            recording_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/recording/${callId}`
          }
        ]
      })
    }

    // Handle other events
    return NextResponse.json({
      call_id: callId,
      status: 'handled',
      event_type: eventType
    })

  } catch (error) {
    console.error('Voice webhook error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Voice webhook error'
    }, { status: 500 })
  }
}
