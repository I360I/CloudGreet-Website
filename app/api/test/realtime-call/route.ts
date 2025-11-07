import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Initiate Real-time Test Call via Telnyx
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
    const { phoneNumber, businessId } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      )
    }

    const targetBusinessId = businessId || authResult.businessId

    // Get business phone number for "from" field
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('phone_number')
      .eq('id', targetBusinessId)
      .single()

    if (businessError || !business?.phone_number) {
      return NextResponse.json(
        { success: false, message: 'Business phone number not configured. Please set up your phone number first.' },
        { status: 400 }
      )
    }

    // Check if Telnyx is configured
    if (!process.env.TELNYX_API_KEY || !process.env.TELNYX_CONNECTION_ID) {
      logger.error('Telnyx not configured for test call', { businessId: targetBusinessId })
      return NextResponse.json(
        { success: false, message: 'Call service not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // Format phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`

    // Create call via Telnyx Call Control API
    const callPayload = {
      to: formattedPhone,
      from: business.phone_number,
      connection_id: process.env.TELNYX_CONNECTION_ID,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-webhook`,
      webhook_url_method: 'POST'
    }

    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload)
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.text()
      logger.error('Telnyx call initiation failed', {
        status: telnyxResponse.status,
        error: errorData,
        phoneNumber: formattedPhone,
        businessId: targetBusinessId
      })

      let errorMessage = 'Failed to initiate call'
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorMessage = errorJson.errors[0].detail || errorJson.errors[0].title || errorMessage
        }
      } catch (e) {
        // Keep default error message
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 500 }
      )
    }

    const callData = await telnyxResponse.json()
    const callControlId = callData.data?.call_control_id || callData.data?.id

    // Store call in database
    const { error: callError } = await supabaseAdmin
      .from('calls')
      .insert({
        business_id: targetBusinessId,
        call_id: callControlId,
        from_number: business.phone_number,
        customer_phone: formattedPhone,
        call_status: 'initiated',
        call_duration: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (callError) {
      logger.error('Failed to save test call to database', {
        error: callError instanceof Error ? callError.message : String(callError),
        callControlId
      })
      // Don't fail the request - call was initiated
    }

    logger.info('Test call initiated successfully', {
      phoneNumber: formattedPhone,
      from: business.phone_number,
      callControlId,
      businessId: targetBusinessId,
      userId: authResult.userId
    })

    return NextResponse.json({
      success: true,
      message: 'Test call initiated successfully! You should receive a call shortly.',
      callId: callControlId,
      to: formattedPhone,
      from: business.phone_number
    })
  } catch (error) {
    logger.error('Error initiating test call', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { success: false, message: 'Failed to initiate test call. Please try again.' },
      { status: 500 }
    )
  }
}

