import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { normalizePhoneForLookup } from '@/lib/phone-normalization'
import { enforceRequestSizeLimit } from '@/lib/request-limits'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'
import { withTimeout, TIMEOUT_CONFIG } from '@/lib/timeout'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Client Test Call API
 * 
 * POST: Place a test call to the client's assigned phone number
 * This allows clients to test their AI receptionist
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (10 requests per 15 minutes)
    const rateLimitResult = await moderateRateLimit(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many test call requests. Please wait before trying again.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime)
          }
        }
      )
    }

    // Enforce request size limit (1MB)
    const sizeCheck = enforceRequestSizeLimit(request)
    if ('error' in sizeCheck) {
      return sizeCheck.error
    }

    // Verify authentication
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.businessId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { phoneNumber } = body || {}

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, phone_number, phone, retell_agent_id, subscription_status')
      .eq('id', authResult.businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { success: false, message: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify subscription is active
    if (business.subscription_status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Active subscription required to place test calls' },
        { status: 403 }
      )
    }

    if (!business.retell_agent_id) {
      return NextResponse.json(
        { success: false, message: 'AI agent not configured. Please complete onboarding.' },
        { status: 400 }
      )
    }

    const businessPhoneNumber = normalizePhoneForLookup(business.phone_number || business.phone)
    if (!businessPhoneNumber) {
      return NextResponse.json(
        { success: false, message: 'No phone number assigned. Please complete onboarding.' },
        { status: 400 }
      )
    }

    // Use provided phone number or default to business phone
    const targetPhone = phoneNumber ? normalizePhoneForLookup(phoneNumber) : businessPhoneNumber
    if (!targetPhone) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Check Telnyx configuration
    const telnyxApiKey = process.env.TELNYX_API_KEY
    const telnyxConnectionId = process.env.TELNYX_CONNECTION_ID
    const telnyxPhoneNumber = process.env.TELNYX_PHONE_NUMBER
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'

    if (!telnyxApiKey) {
      logger.error('Telnyx API key not configured for client test call')
      return NextResponse.json(
        { success: false, message: 'Call service not available. Please try again later.' },
        { status: 503 }
      )
    }

    if (!telnyxConnectionId && !telnyxPhoneNumber) {
      logger.error('Telnyx connection ID or phone number not configured')
      return NextResponse.json(
        { success: false, message: 'Call service not available. Please try again later.' },
        { status: 503 }
      )
    }

    // Place call via Telnyx
    const fromNumber = telnyxPhoneNumber || businessPhoneNumber
    const callPayload: any = {
      to: targetPhone,
      from: fromNumber,
      webhook_url: `${appUrl}/api/telnyx/voice-webhook`,
      webhook_url_method: 'POST'
    }

    if (telnyxConnectionId) {
      callPayload.connection_id = telnyxConnectionId
    }

    // Call Telnyx API with timeout
    const telnyxResponse = await withTimeout(
      fetch('https://api.telnyx.com/v2/calls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${telnyxApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callPayload)
      }),
      TIMEOUT_CONFIG.TELNYX_API,
      'Telnyx API request timeout'
    )

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
        { success: false, message: 'Failed to place call. Please check configuration and try again.' },
        { status: 500 }
      )
    }

    const callData = await telnyxResponse.json()
    const callControlId = callData.data?.call_control_id

    if (!callControlId) {
      logger.error('No call_control_id in Telnyx response', { callData })
      return NextResponse.json(
        { success: false, message: 'Invalid response from call service' },
        { status: 500 }
      )
    }

    logger.info('Client test call placed successfully', {
      callControlId,
      businessId: business.id,
      businessName: business.business_name,
      targetPhone,
      retellAgentId: business.retell_agent_id
    })

    return NextResponse.json({
      success: true,
      callControlId,
      message: 'Test call initiated. You should receive a call shortly.'
    })

  } catch (error) {
    logger.error('Error placing client test call', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { success: false, message: 'Call request timed out. Please try again.' },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to place test call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
