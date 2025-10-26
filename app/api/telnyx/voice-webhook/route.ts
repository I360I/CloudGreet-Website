import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
      return NextResponse.json({
        call_id: callId,
        status: 'answered',
        instructions: [
          {
            instruction: 'say',
            text: 'Hello! Thank you for calling CloudGreet. I am your AI receptionist. How can I help you today?',
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