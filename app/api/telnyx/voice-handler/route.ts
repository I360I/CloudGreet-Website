import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { call_id, digits, speech } = body

    logger.info('Voice handler called', {
      call_id,
      digits,
      speech: speech?.transcript
    })

    // Handle user input
    if (digits === '1' || speech?.transcript?.toLowerCase().includes('ai')) {
      // Transfer to AI assistant
      return NextResponse.json({
        call_id,
        status: 'success',
        instructions: [
          {
            instruction: 'say',
            text: 'Please hold while I connect you with our AI assistant.',
            voice: 'alloy'
          },
          {
            instruction: 'transfer',
            destination: 'ai_assistant'
          }
        ]
      })
    } else if (digits === '2' || speech?.transcript?.toLowerCase().includes('human')) {
      // Transfer to human
      return NextResponse.json({
        call_id,
        status: 'success',
        instructions: [
          {
            instruction: 'say',
            text: 'Please hold while I connect you with a team member.',
            voice: 'alloy'
          },
          {
            instruction: 'transfer',
            destination: 'human_agent'
          }
        ]
      })
    } else {
      // Invalid input, try again
      return NextResponse.json({
        call_id,
        status: 'success',
        instructions: [
          {
            instruction: 'say',
            text: 'I didn\'t understand that. Press 1 for our AI assistant, or press 2 to speak with a human.',
            voice: 'alloy'
          },
          {
            instruction: 'gather',
            input: ['dtmf', 'speech'],
            num_digits: 1,
            timeout: 10,
            speech_timeout_secs: 5,
            action: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/telnyx/voice-handler`
          }
        ]
      })
    }

  } catch (error) {
    logger.error('Voice handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      endpoint: 'telnyx/voice-handler'
    })
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
