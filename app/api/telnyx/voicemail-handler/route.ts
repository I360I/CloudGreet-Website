import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { call_id, recording_url, duration } = body

    logger.info('Voicemail handler called', {
      call_id,
      recording_url,
      duration
    })

    // Store voicemail in database
    const { data: voicemailRecord, error: voicemailError } = await supabaseAdmin
      .from('call_logs')
      .insert({
        call_id,
        recording_url,
        duration: duration || 0,
        status: 'voicemail',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (voicemailError) {
      logger.error('Failed to store voicemail', { 
        error: voicemailError, 
        call_id,
        recording_url
      })
    }

    // Send notification to business owner
    if (voicemailRecord) {
      try {
        const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'admin_token'}`
          },
          body: JSON.stringify({
            type: 'voicemail_received',
            message: `New voicemail received (${duration || 0} seconds)`,
            businessId: voicemailRecord.business_id,
            priority: 'high'
          })
        })

        if (!notificationResponse.ok) {
          logger.error('Failed to send voicemail notification', { 
            error: new Error('Notification API failed'), 
            call_id,
            status: notificationResponse.status
          })
        }
      } catch (notificationError) {
        logger.error('Error sending voicemail notification', { 
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error', 
          call_id
        })
      }
    }

    return NextResponse.json({
      call_id,
      status: 'success',
      message: 'Voicemail processed successfully'
    })

  } catch (error) {
    logger.error('Voicemail handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      endpoint: 'telnyx/voicemail-handler'
    })
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      message: 'Failed to process voicemail'
    }, { status: 500 })
  }
}
