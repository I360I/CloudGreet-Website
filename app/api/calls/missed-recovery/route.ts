import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { queueJob } from '@/lib/job-queue'
import { normalizePhoneForLookup } from '@/lib/phone-normalization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Missed Call Recovery Endpoint
 * 
 * Sends SMS to missed callers to recover the lead
 * 
 * Called by:
 * - process-recoveries cron job
 * - Voice webhook when missed call detected
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callId, businessId, callerPhone, callerName, reason } = body

    if (!businessId || !callerPhone) {
      return NextResponse.json(
        { success: false, error: 'businessId and callerPhone are required' },
        { status: 400 }
      )
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneForLookup(callerPhone)
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Check if caller has opted out
    const { data: optOut } = await supabaseAdmin
      .from('sms_opt_outs')
      .select('id')
      .eq('business_id', businessId)
      .eq('phone_number', normalizedPhone)
      .single()

    if (optOut) {
      logger.info('Skipping missed call recovery - caller opted out', {
        businessId,
        callerPhone: normalizedPhone
      })
      return NextResponse.json({
        success: false,
        error: 'Caller has opted out of SMS',
        skipped: true
      })
    }

    // Get business info for personalized message
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, phone_number, business_type')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for missed call recovery', {
        businessId,
        error: businessError?.message || 'Business not found'
      })
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    // Generate personalized recovery message
    const businessName = business.business_name || 'our team'
    const businessPhone = business.phone_number || business.phone || ''
    
    // Business-type specific messages
    let recoveryMessage = ''
    switch (business.business_type?.toLowerCase()) {
      case 'hvac':
        recoveryMessage = `Hi! We missed your call to ${businessName}. We're here to help with your HVAC needs. Call us back at ${businessPhone} or reply to this message. Reply STOP to opt out; HELP for help.`
        break
      case 'roofing':
        recoveryMessage = `Hi! We missed your call to ${businessName}. We'd love to help with your roofing project. Call us back at ${businessPhone} or reply to this message. Reply STOP to opt out; HELP for help.`
        break
      case 'painting':
        recoveryMessage = `Hi! We missed your call to ${businessName}. Ready to transform your space? Call us back at ${businessPhone} or reply to this message. Reply STOP to opt out; HELP for help.`
        break
      default:
        recoveryMessage = `Hi! We missed your call to ${businessName}. We'd love to help! Call us back at ${businessPhone} or reply to this message. Reply STOP to opt out; HELP for help.`
    }

    // Queue SMS for sending
    try {
      await queueJob('send_sms', {
        to: normalizedPhone,
        message: recoveryMessage,
        from: businessPhone,
        businessId: businessId,
        type: 'missed_call_recovery'
      }, { maxAttempts: 3 })

      // Log recovery attempt
      const { error: logError } = await supabaseAdmin
        .from('missed_call_recoveries')
        .insert({
          business_id: businessId,
          call_id: callId || null,
          caller_phone: normalizedPhone,
          caller_name: callerName || null,
          reason: reason || 'missed_call',
          message_sent: recoveryMessage,
          status: 'sent',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (logError) {
        logger.warn('Failed to log missed call recovery', {
          error: logError.message,
          businessId,
          callerPhone: normalizedPhone
        })
        // Don't fail - SMS was queued
      }

      logger.info('Missed call recovery SMS queued', {
        businessId,
        callerPhone: normalizedPhone,
        businessName: business.business_name
      })

      return NextResponse.json({
        success: true,
        message: 'Recovery SMS queued successfully'
      })

    } catch (queueError) {
      logger.error('Failed to queue missed call recovery SMS', {
        error: queueError instanceof Error ? queueError.message : 'Unknown error',
        businessId,
        callerPhone: normalizedPhone
      })

      return NextResponse.json(
        { success: false, error: 'Failed to queue recovery SMS' },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error('Error in missed call recovery', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


