import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      callId, 
      businessId, 
      callerPhone, 
      callerName, 
      reason 
    } = body

    if (!businessId || !callerPhone) {
      return NextResponse.json({ 
        error: 'Missing required fields: businessId, callerPhone' 
      }, { status: 400 })
    }

    logger.info('Missed call recovery triggered', { 
      callId, 
      businessId, 
      callerPhone, 
      reason 
    })

    // Get business information
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, phone_number, business_type, services, business_hours')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for missed call recovery', { 
        businessId, 
        error: businessError?.message 
      })
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if caller has opted out
    const { data: optOut } = await supabaseAdmin
      .from('sms_opt_outs')
      .select('id')
      .eq('phone_number', callerPhone)
      .eq('business_id', businessId)
      .single()

    if (optOut) {
      logger.info('Caller has opted out of SMS', { callerPhone, businessId })
      return NextResponse.json({ 
        success: true, 
        message: 'Caller has opted out of SMS' 
      })
    }

    // Create personalized recovery message
    const businessName = business.business_name || 'Our business'
    const businessType = business.business_type || 'service business'
    const services = business.services || ['general services']
    const hours = business.business_hours?.hours || 'Monday-Friday 9AM-5PM'

    let recoveryMessage = `Hi! We missed your call to ${businessName}. We're a ${businessType} and we'd love to help you with ${services.join(', ')}. `

    // Add business hours if available
    if (hours) {
      recoveryMessage += `We're available ${hours}. `
    }

    // Add call-to-action based on business type
    if (businessType.toLowerCase().includes('hvac')) {
      recoveryMessage += `Need AC repair, heating service, or maintenance? Reply BOOK to schedule a free consultation!`
    } else if (businessType.toLowerCase().includes('paint')) {
      recoveryMessage += `Need interior/exterior painting or pressure washing? Reply BOOK for a free estimate!`
    } else if (businessType.toLowerCase().includes('roof')) {
      recoveryMessage += `Need roof repair, replacement, or gutter service? Reply BOOK for a free inspection!`
    } else {
      recoveryMessage += `Reply BOOK to schedule a consultation or call us back at ${business.phone_number}.`
    }

    // Add opt-out message
    recoveryMessage += ` Reply STOP to opt out.`

    // Send SMS via Telnyx
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
      const smsResponse = await fetch(`${baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: callerPhone,
          message: recoveryMessage,
          businessId: businessId,
          type: 'missed_call_recovery',
          callId: callId
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!smsResponse.ok) {
        throw new Error(`SMS API returned ${smsResponse.status}`)
      }

      const smsResult = await smsResponse.json()
      
      // Log the recovery attempt (update if record exists, otherwise insert)
      const existingRecovery = await supabaseAdmin
        .from('missed_call_recoveries')
        .select('id')
        .eq('business_id', businessId)
        .eq('call_id', callId)
        .single()
      
      if (existingRecovery.data) {
        await supabaseAdmin
          .from('missed_call_recoveries')
          .update({
            caller_name: callerName,
            message_sent: recoveryMessage,
            sms_api_response: smsResult,
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecovery.data.id)
      } else {
        await supabaseAdmin
          .from('missed_call_recoveries')
          .insert({
            business_id: businessId,
            call_id: callId,
            caller_phone: callerPhone,
            caller_name: callerName,
            reason: reason,
            message_sent: recoveryMessage,
            sms_api_response: smsResult,
            status: 'sent',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      }

      logger.info('Missed call recovery SMS sent successfully', { 
        callId, 
        businessId, 
        callerPhone,
        messageId: smsResult.messageId 
      })

      return NextResponse.json({
        success: true,
        message: 'Recovery SMS sent successfully',
        messageId: smsResult.messageId
      })

    } catch (smsError) {
      logger.error('Failed to send missed call recovery SMS', { 
        error: smsError instanceof Error ? smsError.message : 'Unknown error',
        callId,
        businessId,
        callerPhone
      })

      // Still log the attempt even if SMS fails
      const existingRecovery = await supabaseAdmin
        .from('missed_call_recoveries')
        .select('id')
        .eq('business_id', businessId)
        .eq('call_id', callId)
        .single()
      
      const failureData = {
        caller_name: callerName,
        message_sent: recoveryMessage,
        sms_api_response: { error: 'SMS sending failed', details: smsError instanceof Error ? smsError.message : 'Unknown error' },
        status: 'failed',
        updated_at: new Date().toISOString()
      }
      
      if (existingRecovery.data) {
        await supabaseAdmin
          .from('missed_call_recoveries')
          .update(failureData)
          .eq('id', existingRecovery.data.id)
      } else {
        await supabaseAdmin
          .from('missed_call_recoveries')
          .insert({
            business_id: businessId,
            call_id: callId,
            caller_phone: callerPhone,
            reason: reason,
            ...failureData,
            created_at: new Date().toISOString()
          })
      }

      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send recovery SMS' 
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('Missed call recovery error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
