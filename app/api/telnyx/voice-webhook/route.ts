import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Telnyx voice webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract call information
    const {
      data: {
        event_type,
        payload: {
          call_control_id,
          call_leg_id,
          from,
          to,
          direction,
          state
        } = {}
      } = {}
    } = body

    const callId = call_control_id || call_leg_id

    logger.info('Premium voice webhook received', { 
      event_type, 
      callId, 
      from, 
      to, 
      direction,
      state 
    })

    // Handle call.answered event - PREMIUM REALTIME AI
    if (event_type === 'call.answered') {
      return NextResponse.json({
        call_id: callId,
        status: 'answered',
        instructions: [
          {
            instruction: 'stream_audio',
            stream_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/realtime-stream`,
            stream_url_method: 'POST'
          }
        ]
      })
    }

    // Handle call.hangup event
    if (event_type === 'call.hangup') {
      logger.info('Premium call ended', { 
        callId, 
        from, 
        to
      })
      
      return NextResponse.json({
        call_id: callId,
        status: 'completed'
      })
    }

    // Handle other events
    return NextResponse.json({
      call_id: callId,
      status: 'received'
    })

  } catch (error) {
    logger.error('Premium voice webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'Thank you for calling CloudGreet. Our AI system is currently being configured. Please try again later.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    }, { status: 500 })
  }
}