import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Missed Call Recovery - Automatically SMS callers who didn't connect
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const { callId, businessId, callerPhone, callerName, reason = 'missed' } = body

    if (!callId || !businessId || !callerPhone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Validate environment variables
    if (!process.env.TELNYX_API_KEY) {
      logger.error('Missing TELNYX_API_KEY environment variable', { requestId })
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }

    // Get business details
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for missed call recovery', { businessId, error: businessError?.message })
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    // Get business phone number from phone_numbers table
    const { data: phoneRecord } = await supabaseAdmin
      .from('phone_numbers')
      .select('phone_number')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .single()

    const businessPhone = phoneRecord?.phone_number || business.phone_number

    // Generate personalized recovery message
    const recoveryMessage = generateRecoveryMessage(business, callerName, reason)

    // Send SMS via Telnyx
    if (!process.env.TELNYX_API_KEY) {
      logger.error('Telnyx not configured for missed call recovery')
      return NextResponse.json({
        success: false,
        error: 'SMS service not configured'
      }, { status: 503 })
    }

    const smsResponse = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: businessPhone,
        to: callerPhone,
        text: recoveryMessage,
        type: 'SMS'
      })
    })

    if (!smsResponse.ok) {
      const errorData = await smsResponse.text()
      logger.error('Failed to send missed call SMS', {
        error: errorData,
        status: smsResponse.status,
        callId,
        businessId,
        callerPhone
      })
      
      return NextResponse.json({
        success: false,
        error: 'Failed to send SMS',
        details: errorData
      }, { status: 500 })
    }

    const smsResult = await smsResponse.json()

    // Log the recovery attempt
    const { error: smsLogError } = await supabaseAdmin
      .from('sms_messages')
      .insert({
        business_id: businessId,
        from_number: businessPhone,
        to_number: callerPhone,
        message_text: recoveryMessage,
        direction: 'outbound',
        status: 'sent',
        message_type: 'missed_call_recovery',
        telnyx_message_id: smsResult.data?.id,
        created_at: new Date().toISOString()
      })

    if (smsLogError) {
      logger.warn('Failed to log SMS recovery message', {
        error: smsLogError.message,
        requestId,
        businessId,
        callId
      })
    }

    // Update call record
    const { error: callUpdateError } = await supabaseAdmin
      .from('calls')
      .update({
        recovery_sms_sent: true,
        recovery_sms_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    if (callUpdateError) {
      logger.warn('Failed to update call record with recovery status', {
        error: callUpdateError.message,
        requestId,
        callId
      })
    }

    // Send notification to business owner
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'client_support',
        message: `Missed call recovery SMS sent to ${callerPhone}`,
        businessId: businessId,
        priority: 'normal'
      })
    }).catch(err => logger.error('Failed to send recovery notification', { error: err }))

    logger.info('Missed call recovery SMS sent', {
      requestId,
      callId,
      businessId,
      callerPhone,
      smsId: smsResult.data?.id
    })

    return NextResponse.json({
      success: true,
      message: 'Recovery SMS sent successfully',
      smsId: smsResult.data?.id,
      messageText: recoveryMessage
    })

  } catch (error) {
    logger.error('Missed call recovery error', {
      requestId,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process missed call recovery'
    }, { status: 500 })
  }
}

// Generate personalized recovery message based on business type
function generateRecoveryMessage(business: any, callerName: string | null, reason: string): string {
  const businessName = business.business_name
  const businessType = business.business_type?.toLowerCase() || 'service'
  const name = callerName ? `Hi ${callerName}` : 'Hi there'

  // Business-type specific messages
  if (businessType.includes('hvac')) {
    return `${name}! We just missed your call at ${businessName}. Need HVAC service? Text back or call again - we're here to help! Reply BOOK to schedule service.`
  } else if (businessType.includes('plumbing')) {
    return `${name}! Sorry we missed your call at ${businessName}. Plumbing emergency? Text back NOW or call again - we respond fast! Reply URGENT for immediate help.`
  } else if (businessType.includes('painting')) {
    return `${name}! We missed your call at ${businessName}. Ready for a quote? Text back with your project details or call again. Reply QUOTE to get started!`
  } else if (businessType.includes('roofing')) {
    return `${name}! Missed your call at ${businessName}. Roof issues? Text back or call again for a free inspection. Reply INSPECT to schedule!`
  } else if (businessType.includes('electrical')) {
    return `${name}! We missed your call at ${businessName}. Electrical problems? Text back or call again - we're available! Reply HELP for immediate assistance.`
  } else {
    return `${name}! We just missed your call at ${businessName}. How can we help? Text back or call again - we're ready to assist! Reply INFO for more details.`
  }
}

// Cron job endpoint - Process all missed calls from last hour
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Get all missed/unanswered calls from last hour that haven't had recovery SMS sent
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: missedCalls, error } = await supabaseAdmin
      .from('calls')
      .select('*, businesses(*)')
      .in('status', ['missed', 'no-answer', 'busy', 'failed'])
      .gte('created_at', oneHourAgo)
      .is('recovery_sms_sent', null)
      .not('from_number', 'is', null)

    if (error) {
      logger.error('Failed to fetch missed calls', { error: error.message.replace(/[<>]/g, '') })
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch missed calls'
      }, { status: 500 })
    }

    const results = []

    for (const call of missedCalls || []) {
      if (!call.businesses || !call.from_number) continue

      try {
        // Send recovery SMS
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/calls/missed-recovery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: call.call_id,
            businessId: call.business_id,
            callerPhone: call.from_number,
            callerName: call.caller_name,
            reason: call.status
          })
        })

        const result = await response.json()
        results.push({
          callId: call.call_id,
          callerPhone: call.from_number,
          success: result.success
        })

      } catch (callError) {
        logger.error('Failed to process missed call', { 
          error: callError, 
          callId: call.call_id 
        })
      }
    }

    logger.info('Missed call recovery batch completed', {
      requestId,
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length
    })

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      results
    })

  } catch (error) {
    logger.error('Missed call recovery batch error', {
      requestId,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
     })
    
    return NextResponse.json({
      success: false,
      error: 'Batch processing failed'
    }, { status: 500 })
  }
}




