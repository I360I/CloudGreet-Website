import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { normalizePhoneForLookup } from '@/lib/phone-normalization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Test Call API
 * 
 * POST: Place a test call to verify SIP bridge and call routing
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    const { businessId, phoneNumber } = body || {}

    if (!businessId && !phoneNumber) {
      return NextResponse.json(
        { error: 'Either businessId or phoneNumber is required' },
        { status: 400 }
      )
    }

    // Get business info
    let business: BusinessClient | null = null
    if (businessId) {
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('id, business_name, phone_number, phone, retell_agent_id')
        .eq('id', businessId)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        )
      }
      business = data
    } else if (phoneNumber) {
      const normalizedPhone = normalizePhoneForLookup(phoneNumber)
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('id, business_name, phone_number, phone, retell_agent_id')
        .or(`phone_number.eq.${normalizedPhone},phone.eq.${normalizedPhone}`)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Business not found for phone number' },
          { status: 404 }
        )
      }
      business = data
    }

    if (!business.retell_agent_id) {
      return NextResponse.json(
        { error: 'Business has no Retell agent configured' },
        { status: 400 }
      )
    }

    const targetPhone = normalizePhoneForLookup(business.phone_number || business.phone)
    if (!targetPhone) {
      return NextResponse.json(
        { error: 'Business has no valid phone number' },
        { status: 400 }
      )
    }

    // Check Telnyx configuration
    const telnyxApiKey = process.env.TELNYX_API_KEY
    const telnyxConnectionId = process.env.TELNYX_CONNECTION_ID
    const telnyxPhoneNumber = process.env.TELNYX_PHONE_NUMBER || process.env.TELYNX_PHONE_NUMBER
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'

    if (!telnyxApiKey) {
      return NextResponse.json(
        { error: 'Telnyx API key not configured' },
        { status: 503 }
      )
    }

    if (!telnyxConnectionId && !telnyxPhoneNumber) {
      return NextResponse.json(
        { error: 'Telnyx connection ID or phone number not configured' },
        { status: 503 }
      )
    }

    // Place call via Telnyx
    const fromNumber = telnyxPhoneNumber || targetPhone
    const callPayload: TestCallPayload = {
      to: targetPhone,
      from: fromNumber,
      webhook_url: `${appUrl}/api/telnyx/voice-webhook`,
      webhook_url_method: 'POST'
    }

    if (telnyxConnectionId) {
      callPayload.connection_id = telnyxConnectionId
    }

    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload)
    })

    if (!telnyxResponse.ok) {
      let errorText: string
      try {
        errorText = await telnyxResponse.text()
      } catch (textError) {
        errorText = 'Failed to read error response'
      }
      logger.error('Failed to place test call via Telnyx', {
        status: telnyxResponse.status,
        error: errorText,
        businessId: business.id
      })
      // Don't expose full error details to client for security
      return NextResponse.json(
        { error: 'Failed to place call. Please check configuration and try again.' },
        { status: 500 }
      )
    }

    const callData = await telnyxResponse.json()
    const callControlId = callData.data?.call_control_id

    if (!callControlId) {
      logger.error('No call_control_id in Telnyx response', { callData })
      return NextResponse.json(
        { error: 'Invalid response from Telnyx' },
        { status: 500 }
      )
    }

    logger.info('Test call placed successfully', {
      callControlId,
      businessId: business.id,
      businessName: business.business_name,
      targetPhone,
      retellAgentId: business.retell_agent_id
    })

    return NextResponse.json({
      success: true,
      callControlId,
      business: {
        id: business.id,
        name: business.business_name,
        phone: targetPhone,
        retellAgentId: business.retell_agent_id
      },
      message: 'Test call placed. Monitor logs to see SIP format success.'
    })

  } catch (error) {
    logger.error('Error placing test call', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to place test call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

