import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'
import { enforceRequestSizeLimit } from '@/lib/request-limits'
import { strictRateLimit } from '@/lib/rate-limiting-redis'
import { withTimeout, TIMEOUT_CONFIG } from '@/lib/timeout'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Initiate Call via Telnyx (Landing Page)
 * This is used for the public landing page "Test Call" feature
 */
export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting (5 requests per 15 minutes) - calls are expensive
    const rateLimitResult = await strictRateLimit(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many call requests. Please wait before trying again.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '5',
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

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    const { phoneNumber, businessId, businessInfo } = body || {}

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Check if Telnyx is configured
    if (!process.env.TELNYX_API_KEY || !process.env.TELNYX_CONNECTION_ID) {
      logger.error('Telnyx not configured for landing page call')
      return NextResponse.json(
        { success: false, message: 'Call service not available. Please try again later.' },
        { status: 503 }
      )
    }

    // Use demo business or provided business
    let fromNumber = process.env.TELNYX_PHONE_NUMBER || '+18333956731'
    let targetBusinessId = businessId || '00000000-0000-0000-0000-000000000001'

    // If businessId provided, get their phone number
    if (businessId) {
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('phone_number')
        .eq('id', businessId)
        .single()

      if (business?.phone_number) {
        fromNumber = business.phone_number
      }
    }

    // Format phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`

    // Create call via Telnyx Call Control API
    const callPayload = {
      to: formattedPhone,
      from: fromNumber,
      connection_id: process.env.TELNYX_CONNECTION_ID,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-webhook`,
      webhook_url_method: 'POST'
    }

    // Call Telnyx API with timeout
    const telnyxResponse = await withTimeout(
      fetch('https://api.telnyx.com/v2/calls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callPayload)
      }),
      TIMEOUT_CONFIG.TELNYX_API,
      'Telnyx API request timeout'
    )

    if (!telnyxResponse.ok) {
      let errorData: string
      try {
        errorData = await telnyxResponse.text()
      } catch (textError) {
        errorData = 'Failed to read error response'
      }
      logger.error('Telnyx call initiation failed (landing page)', {
        status: telnyxResponse.status,
        error: errorData,
        phoneNumber: formattedPhone
      })

      let errorMessage = 'Failed to initiate call. Please try again later.'
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.errors && errorJson.errors.length > 0) {
          // Use user-friendly error message, don't expose internal details
          const detail = errorJson.errors[0].detail || errorJson.errors[0].title || ''
          if (detail.includes('invalid') || detail.includes('Invalid')) {
            errorMessage = 'Invalid phone number. Please check and try again.'
          } else if (detail.includes('rate limit') || detail.includes('limit')) {
            errorMessage = 'Too many requests. Please try again in a moment.'
          }
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

    // Store call in database if businessId provided
    if (targetBusinessId) {
      const { error: callError } = await supabaseAdmin
        .from('calls')
        .insert({
          business_id: targetBusinessId,
          call_id: callControlId,
          from_number: fromNumber,
          customer_phone: formattedPhone,
          call_status: 'initiated',
          call_duration: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (callError) {
        logger.error('Failed to save landing page call to database', {
          error: callError instanceof Error ? callError.message : String(callError)
        })
        // Don't fail the request
      }
    }

    logger.info('Landing page call initiated successfully', {
      phoneNumber: formattedPhone,
      from: fromNumber,
      callControlId,
      businessId: targetBusinessId
    })

    return NextResponse.json({
      success: true,
      message: 'Call initiated successfully! You should receive a call shortly.',
      callId: callControlId,
      to: formattedPhone,
      from: fromNumber
    })
  } catch (error) {
    logger.error('Error initiating Telnyx call (landing page)', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { success: false, message: 'Failed to initiate call. Please try again.' },
      { status: 500 }
    )
  }
}
