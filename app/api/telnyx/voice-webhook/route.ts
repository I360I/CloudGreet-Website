import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Health check endpoint for Telnyx webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Telnyx voice webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    // Set timeout for the entire function
    const timeoutId = setTimeout(() => {
      logger.error('Voice webhook timeout - returning default response')
    }, 5000) // 5 second timeout

    const body = await request.json()
    
    // Extract basic call information
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

    logger.info('Voice webhook called', { 
      event_type, 
      call_control_id, 
      from, 
      to, 
      direction,
      state 
    })

    // Handle call.answered event
    if (event_type === 'call.answered') {
      clearTimeout(timeoutId)
      
      // Return simple, fast response for demo
      return NextResponse.json({
        call_id: call_control_id,
        status: 'answered',
        instructions: [
          {
            instruction: 'say',
            text: 'Thank you for calling CloudGreet Demo! How can I help you today?',
            voice: 'alloy'
          },
          {
            instruction: 'gather',
            input: ['speech'],
            timeout: 15,
            speech_timeout: 'auto',
            speech_model: 'default',
            action_on_empty_result: true,
            finish_on_key: '#',
            action: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-handler`
          }
        ]
      })
    }

    // Handle call.hangup event
    if (event_type === 'call.hangup') {
      clearTimeout(timeoutId)
      
      logger.info('Call ended', { 
        call_control_id, 
        from, 
        to, 
        duration: body.data?.payload?.duration 
      })
      
      return NextResponse.json({
        call_id: call_control_id,
        status: 'completed'
      })
    }

    // Handle other events
    clearTimeout(timeoutId)
    return NextResponse.json({
      call_id: call_control_id,
      status: 'received'
    })

  } catch (error) {
    logger.error('Voice webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'voice_webhook'
    })
    
    // Return simple error response
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'Sorry, we\'re experiencing technical difficulties. Please try again later.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    }, { status: 500 })
  }
}