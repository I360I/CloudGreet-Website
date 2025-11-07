import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { TelnyxClient } from '@/lib/telnyx'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Send SMS Message via Telnyx
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, message, businessId, type } = body

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { success: false, message: 'Recipient phone number and message are required' },
        { status: 400 }
      )
    }

    // Validate business access
    const targetBusinessId = businessId || authResult.businessId
    if (targetBusinessId !== authResult.businessId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to send SMS for this business' },
        { status: 403 }
      )
    }

    // Get business phone number for "from" field
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('phone_number')
      .eq('id', targetBusinessId)
      .single()

    if (businessError || !business?.phone_number) {
      logger.warn('Business phone number not found', { 
        businessId: targetBusinessId,
        error: businessError instanceof Error ? businessError.message : String(businessError)
      })
    }

    // Initialize Telnyx client
    const telnyxClient = new TelnyxClient()
    
    // Send SMS via Telnyx
    let telnyxResponse = null
    let smsStatus = 'failed'
    let externalId = null
    
    try {
      telnyxResponse = await telnyxClient.sendSMS(
        to,
        message,
        business?.phone_number
      )
      
      smsStatus = 'sent'
      externalId = telnyxResponse?.data?.id || null
      
      logger.info('SMS sent successfully via Telnyx', {
        to,
        from: business?.phone_number,
        messageId: externalId,
        businessId: targetBusinessId,
        type: type || 'manual_sms',
        userId: authResult.userId
      })
    } catch (telnyxError) {
      logger.error('Telnyx SMS send failed', {
        error: telnyxError instanceof Error ? telnyxError.message : String(telnyxError),
        to,
        businessId: targetBusinessId
      })
      
      // Don't fail completely - still save to database with failed status
      smsStatus = 'failed'
    }

    // Save SMS to database with actual status
    const { data: smsRecord, error: smsError } = await supabaseAdmin
      .from('sms_messages')
      .insert({
        business_id: targetBusinessId,
        to_phone: to,
        from_phone: business?.phone_number || null,
        message: message,
        direction: 'outbound',
        status: smsStatus,
        type: type || 'manual_sms',
        external_id: externalId,
        created_by: authResult.userId
      })
      .select()
      .single()

    if (smsError) {
      logger.error('Failed to save SMS to database', { 
        error: smsError instanceof Error ? smsError.message : String(smsError) 
      })
    }

    // Return appropriate response based on status
    if (smsStatus === 'failed') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to send SMS. Please check your phone number configuration and try again.',
          smsId: smsRecord?.id || null
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      smsId: smsRecord?.id || null,
      externalId: externalId
    })
  } catch (error) {
    logger.error('Error sending SMS', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { success: false, message: 'Failed to send SMS. Please try again.' },
      { status: 500 }
    )
  }
}

