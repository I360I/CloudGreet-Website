import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * Process Pending Missed Call Recoveries
 * 
 * This endpoint processes missed call recoveries that are scheduled to be sent.
 * Can be called:
 * - By cron job (Vercel Cron, etc.) every minute
 * - Manually via webhook after missed call (fire-and-forget)
 * 
 * Only processes recoveries where scheduled_at is in the past.
 */

export async function POST(request: NextRequest) {
  try {
    const now = new Date().toISOString()

    // Get all pending recoveries that are ready to be sent
    const { data: pendingRecoveries, error: fetchError } = await supabaseAdmin
      .from('missed_call_recoveries')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(50) // Process up to 50 at a time

    if (fetchError) {
      logger.error('Failed to fetch pending recoveries', { error: fetchError.message })
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch pending recoveries' 
      }, { status: 500 })
    }

    if (!pendingRecoveries || pendingRecoveries.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending recoveries to process',
        processed: 0
      })
    }

    logger.info('Processing missed call recoveries', { count: pendingRecoveries.length })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
    let processed = 0
    let failed = 0

    // Process each recovery
    for (const recovery of pendingRecoveries) {
      try {
        // Check if caller called back (answered call exists)
        const { data: answeredCall } = await supabaseAdmin
          .from('calls')
          .select('id, status')
          .eq('business_id', recovery.business_id)
          .eq('from_number', recovery.caller_phone)
          .in('status', ['answered', 'completed'])
          .gt('created_at', recovery.created_at)
          .limit(1)

        // If they called back and were answered, skip sending recovery
        if (answeredCall && answeredCall.length > 0) {
          await supabaseAdmin
            .from('missed_call_recoveries')
            .update({
              status: 'cancelled',
              notes: 'Caller called back and was answered',
              updated_at: new Date().toISOString()
            })
            .eq('id', recovery.id)
          
          logger.info('Skipped recovery - caller called back', {
            recoveryId: recovery.id,
            callId: recovery.call_id
          })
          continue
        }

        // Call the recovery endpoint
        const recoveryResponse = await fetch(`${baseUrl}/api/calls/missed-recovery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: recovery.call_id,
            businessId: recovery.business_id,
            callerPhone: recovery.caller_phone,
            callerName: recovery.caller_name,
            reason: recovery.reason || 'missed_call'
          })
        })

        if (recoveryResponse.ok) {
          await supabaseAdmin
            .from('missed_call_recoveries')
            .update({
              status: 'sent',
              updated_at: new Date().toISOString()
            })
            .eq('id', recovery.id)
          
          processed++
        } else {
          const errorData = await recoveryResponse.text()
          logger.error('Recovery send failed', {
            recoveryId: recovery.id,
            status: recoveryResponse.status,
            error: errorData
          })
          
          await supabaseAdmin
            .from('missed_call_recoveries')
            .update({
              status: 'failed',
              notes: `Failed to send: ${recoveryResponse.status}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', recovery.id)
          
          failed++
        }

      } catch (error) {
        logger.error('Error processing recovery', {
          recoveryId: recovery.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        failed++
        
        // Mark as failed after 3 attempts
        const attemptCount = (recovery.attempts || 0) + 1
        if (attemptCount >= 3) {
          await supabaseAdmin
            .from('missed_call_recoveries')
            .update({
              status: 'failed',
              attempts: attemptCount,
              notes: `Failed after ${attemptCount} attempts`,
              updated_at: new Date().toISOString()
            })
            .eq('id', recovery.id)
        } else {
          await supabaseAdmin
            .from('missed_call_recoveries')
            .update({
              attempts: attemptCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', recovery.id)
        }
      }
    }

    logger.info('Recovery processing complete', {
      total: pendingRecoveries.length,
      processed,
      failed
    })

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: pendingRecoveries.length
    })

  } catch (error) {
    logger.error('Process recoveries error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process recoveries'
    }, { status: 500 })
  }
}

// Also support GET for manual triggers
export async function GET() {
  return POST(new NextRequest('http://localhost', { method: 'POST' }))
}
