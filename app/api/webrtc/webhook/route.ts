import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    

    const { 
      session_id,
      event_type,
      data: {
        call_control_id,
        from,
        to,
        state,
        direction
      } = {}
    } = body

    // Update session status
    if (session_id) {
      const { error: updateError } = await supabaseAdmin
        .from('webrtc_sessions')
        .update({
          status: state || 'active',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', session_id)

      if (updateError) {
        console.error('❌ Error updating WebRTC session:', updateError)
      }
    }

    // Handle different event types
    switch (event_type) {
      case 'call.initiated':
        
        return NextResponse.json({
          call_id: call_control_id,
          status: 'answered',
          instructions: [
            {
              instruction: 'say',
              text: 'Hello! Thank you for calling our AI receptionist. How can I help you today?',
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

      case 'call.answered':
        
        return NextResponse.json({
          call_id: call_control_id,
          status: 'answered'
        })

      case 'call.hangup':
        
        return NextResponse.json({
          call_id: call_control_id,
          status: 'hangup'
        })

      default:
        
        return NextResponse.json({
          call_id: call_control_id,
          status: 'processed'
        })
    }

  } catch (error: any) {
    console.error('❌ WebRTC webhook error:', error)
    logger.error('WebRTC webhook processing failed', { 
      error: error.message,
      endpoint: 'webrtc_webhook'
    })
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to process WebRTC webhook'
    }, { status: 500 })
  }
}
