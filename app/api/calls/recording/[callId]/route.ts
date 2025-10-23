import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { callId: string } }) {
  try {
    const { callId } = params
    
    if (!callId) {
      return NextResponse.json({ error: 'Call ID required' }, { status: 400 })
    }

    // Handle Telnyx recording webhook
    const recordingData = await request.json()
    
    logger.info('Recording webhook received', {
      callId,
      recordingDataKeys: Object.keys(recordingData).join(', ')
    })

    // Extract recording URL from Telnyx webhook
    const recordingUrl = recordingData.recording_url || recordingData.url
    const duration = recordingData.duration || recordingData.recording_duration

    if (recordingUrl) {
      // Update the call record with recording URL
      const { error: updateError } = await supabaseAdmin
        .from('calls')
        .update({
          recording_url: recordingUrl,
          recording_duration: duration,
          recording_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('call_id', callId)

      if (updateError) {
        logger.error('Failed to update call with recording', { 
          callId, 
          error: updateError.message 
        })
        return NextResponse.json({ error: 'Failed to save recording' }, { status: 500 })
      }

      logger.info('Recording saved successfully', { callId, recordingUrl })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Recording webhook processed' 
    })

  } catch (error) {
    logger.error('Recording webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      callId: params.callId
    })
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { callId: string } }) {
  try {
    const { callId } = params
    
    if (!callId) {
      return NextResponse.json({ error: 'Call ID required' }, { status: 400 })
    }

    // Get the call record with recording info
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('recording_url, recording_duration, recording_status')
      .eq('call_id', callId)
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      recording_url: call.recording_url,
      duration: call.recording_duration,
      status: call.recording_status
    })

  } catch (error) {
    logger.error('Recording GET error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      callId: params.callId
    })
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}