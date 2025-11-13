import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyTelynyxSignature } from '@/lib/webhook-verification'
import { logComplianceEvent } from '@/lib/compliance/logging'
import { normalizePhoneForLookup, normalizePhoneForSIP } from '@/lib/phone-normalization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Telnyx Voice Webhook Handler
 * 
 * Handles Telnyx voice call events:
 * - call.initiated → Bridge call to Retell AI, log call start
 * - call.answered → Update call status
 * - call.ended → Log call completion, store duration
 * - call.hangup → Handle hangup events
 * 
 * Call Flow:
 * 1. Incoming call hits Telnyx number
 * 2. Telnyx sends call.initiated webhook
 * 3. We bridge the call to Retell AI via SIP transfer
 * 4. Retell routes to correct agent (number pre-linked in Retell dashboard)
 * 5. Retell handles conversation and sends booking events to our webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()
    
    // Verify webhook signature (Telnyx)
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')
    
    // Skip verification in development, require in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyTelynyxSignature(rawBody, signature, timestamp)
      if (!isValid) {
        logger.warn('Telnyx voice webhook signature verification failed', {
          hasSignature: !!signature,
          hasTimestamp: !!timestamp
        })
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    }

    // Parse JSON body after verification
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      logger.error('Telnyx voice webhook JSON parse error', { error: parseError instanceof Error ? parseError.message : JSON.stringify(parseError) })
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const eventType = body.data?.event_type || body.event_type || 'unknown'
    const callControlId = body.data?.call_control_id || body.call_control_id
    const callLegId = body.data?.call_leg_id || body.call_leg_id
    const phoneNumber = body.data?.to || body.to
    const fromNumber = body.data?.from || body.from

    logger.info('Telnyx voice webhook received', {
      eventType,
      callControlId,
      callLegId,
      phoneNumber,
      fromNumber
    })

    await logComplianceEvent({
      channel: 'voice',
      eventType,
      path: request.nextUrl.pathname,
      requestBody: body
    })

    // Handle different event types
    switch (eventType) {
      case 'call.initiated':
      case 'call.answered':
      case 'call.ended':
      case 'call.hangup':
        await handleCallEvent(eventType, body.data || body, callControlId, phoneNumber, fromNumber)
        break

      default:
        logger.info('Unhandled Telnyx voice event type', { eventType })
    }

    return NextResponse.json({ success: true, received: true })

  } catch (error) {
    logger.error('Telnyx voice webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Bridge incoming Telnyx call to Retell AI agent
 * 
 * Flow:
 * 1. Call comes to Telnyx number → webhook fires
 * 2. Normalize phone number for consistent lookup
 * 3. Multi-table lookup strategy to find business and agent
 * 4. Answer the Telnyx call
 * 5. Transfer call to Retell SIP endpoint with fallback formats
 * 6. Fallback behavior if transfer fails
 * 
 * Note: Retell SIP format uses phone number for routing since numbers are
 * pre-linked to agents in Retell dashboard during verification.
 */
async function bridgeCallToRetell(
  callControlId: string,
  phoneNumber: string | undefined,
  fromNumber: string | undefined
) {
  try {
    if (!phoneNumber) {
      logger.warn('No phone number in call event, cannot bridge to Retell', { callControlId })
      return
    }

    // Step 1: Normalize phone number for consistent lookup
    const normalizedPhone = normalizePhoneForLookup(phoneNumber)
    if (!normalizedPhone) {
      logger.warn('Failed to normalize phone number for bridge lookup', {
        callControlId,
        originalPhone: phoneNumber
      })
      return
    }

    logger.info('Bridging call to Retell AI - starting lookup', {
      callControlId,
      originalPhone: phoneNumber,
      normalizedPhone,
      fromNumber
    })

    // Step 2: Multi-table lookup strategy
    let business: any = null
    let lookupStrategy = 'unknown'

    // Strategy 1: Try businesses table with normalized phone (check both fields)
    const { data: businessByPhone, error: businessError1 } = await supabaseAdmin
      .from('businesses')
      .select('id, retell_agent_id, business_name, phone_number, phone, escalation_phone')
      .or(`phone_number.eq.${normalizedPhone},phone.eq.${normalizedPhone}`)
      .single()

    if (!businessError1 && businessByPhone) {
      business = businessByPhone
      lookupStrategy = 'businesses_table'
      logger.info('Business found via businesses table', {
        callControlId,
        businessId: business.id,
        strategy: lookupStrategy
      })
    } else {
      // Strategy 2: Try toll_free_numbers table
      const { data: tollFreeNumber, error: tollFreeError } = await supabaseAdmin
        .from('toll_free_numbers')
        .select('number, assigned_to, business_name')
        .eq('number', normalizedPhone)
        .eq('status', 'assigned')
        .single()

      if (!tollFreeError && tollFreeNumber && tollFreeNumber.assigned_to) {
        // Get business from assigned_to
        const { data: businessFromTollFree, error: businessError2 } = await supabaseAdmin
          .from('businesses')
          .select('id, retell_agent_id, business_name, phone_number, phone, escalation_phone')
          .eq('id', tollFreeNumber.assigned_to)
          .single()

        if (!businessError2 && businessFromTollFree) {
          business = businessFromTollFree
          lookupStrategy = 'toll_free_numbers_table'
          logger.info('Business found via toll_free_numbers table', {
            callControlId,
            businessId: business.id,
            strategy: lookupStrategy
          })
        }
      }

      // Strategy 3: Try ai_agents table as last resort
      if (!business) {
        const { data: agent, error: agentError } = await supabaseAdmin
          .from('ai_agents')
          .select('business_id, retell_agent_id, phone_number')
          .eq('phone_number', normalizedPhone)
          .eq('is_active', true)
          .single()

        if (!agentError && agent) {
          const { data: businessFromAgent, error: businessError3 } = await supabaseAdmin
            .from('businesses')
            .select('id, retell_agent_id, business_name, phone_number, phone, escalation_phone')
            .eq('id', agent.business_id)
            .single()

          if (!businessError3 && businessFromAgent) {
            business = businessFromAgent
            lookupStrategy = 'ai_agents_table'
            logger.info('Business found via ai_agents table', {
              callControlId,
              businessId: business.id,
              strategy: lookupStrategy
            })
          }
        }
      }
    }

    if (!business) {
      logger.warn('No business found for call after multi-table lookup', {
        callControlId,
        normalizedPhone,
        originalPhone: phoneNumber,
        strategiesAttempted: ['businesses_table', 'toll_free_numbers_table', 'ai_agents_table']
      })
      // Fallback: Play message and hang up
      await playFallbackMessage(callControlId, 'We apologize, but we could not connect your call. Please try again later.')
      return
    }

    if (!business.retell_agent_id) {
      logger.warn('Business found but no Retell agent ID, cannot bridge call', {
        callControlId,
        businessId: business.id,
        businessName: business.business_name,
        normalizedPhone,
        lookupStrategy
      })
      // Fallback: Forward to escalation phone or play message
      if (business.escalation_phone) {
        await forwardToEscalation(callControlId, business.escalation_phone)
      } else {
        await playFallbackMessage(callControlId, 'Please hold while we connect you with a team member.')
      }
      return
    }

    const telnyxApiKey = process.env.TELNYX_API_KEY
    if (!telnyxApiKey) {
      logger.error('Telnyx API key not configured, cannot bridge call to Retell', {
        callControlId,
        businessId: business.id
      })
      await playFallbackMessage(callControlId, 'We apologize, but our phone system is temporarily unavailable.')
      return
    }

    logger.info('Bridging call to Retell AI', {
      callControlId,
      businessId: business.id,
      retellAgentId: business.retell_agent_id,
      normalizedPhone,
      fromNumber,
      lookupStrategy
    })

    // Step 3: Answer the Telnyx call
    const answerResponse = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!answerResponse.ok) {
      const errorText = await answerResponse.text()
      logger.error('Failed to answer Telnyx call', {
        status: answerResponse.status,
        statusText: answerResponse.statusText,
        error: errorText,
        callControlId,
        businessId: business.id
      })
      return
    }

    logger.info('Telnyx call answered successfully', { callControlId })

    // Step 4: Transfer call to Retell SIP endpoint with multiple format attempts
    // Small delay to ensure call is answered before transfer
    await new Promise(resolve => setTimeout(resolve, 200))

    const sipDigits = normalizePhoneForSIP(normalizedPhone)
    const sipFormats = [
      `sip:${sipDigits}@sip.retellai.com`, // Primary: digits only
      `sip:+${normalizedPhone.replace('+', '')}@sip.retellai.com`, // Fallback 1: E.164 with +
      `sip:${normalizedPhone.replace('+', '')}@sip.retellai.com`, // Fallback 2: E.164 without +
    ]

    let transferSuccess = false
    let successfulFormat = ''

    for (const retellSipUri of sipFormats) {
      try {
        const transferResponse = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/transfer`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${telnyxApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            destination: retellSipUri,
            destination_type: 'sip'
          })
        })

        if (transferResponse.ok) {
          const transferData = await transferResponse.json().catch(() => ({}))
          transferSuccess = true
          successfulFormat = retellSipUri
          
          logger.info('Call successfully bridged to Retell AI', {
            callControlId,
            businessId: business.id,
            retellAgentId: business.retell_agent_id,
            normalizedPhone,
            fromNumber,
            retellSipUri,
            sipFormat: retellSipUri,
            transferResponse: transferData
          })
          break
        } else {
          const errorText = await transferResponse.text().catch(() => 'Unknown error')
          logger.warn('SIP transfer attempt failed, trying next format', {
            callControlId,
            retellSipUri,
            status: transferResponse.status,
            error: errorText
          })
        }
      } catch (transferError) {
        logger.warn('SIP transfer attempt error, trying next format', {
          callControlId,
          retellSipUri,
          error: transferError instanceof Error ? transferError.message : 'Unknown error'
        })
      }
    }

    // Step 5: Fallback behavior if all transfer attempts fail
    if (!transferSuccess) {
      logger.error('All SIP transfer attempts failed, using fallback', {
        callControlId,
        businessId: business.id,
        retellAgentId: business.retell_agent_id,
        normalizedPhone,
        attemptedFormats: sipFormats
      })

      // Try escalation phone first
      if (business.escalation_phone) {
        await forwardToEscalation(callControlId, business.escalation_phone)
      } else {
        // Play message with callback option
        await playFallbackMessage(
          callControlId,
          'We apologize, but we are experiencing technical difficulties. Please leave a message or call back later.'
        )
      }
    }

  } catch (error) {
    logger.error('Error bridging call to Retell', {
      error: error instanceof Error ? error.message : 'Unknown error',
      callControlId,
      phoneNumber,
      stack: error instanceof Error ? error.stack : undefined
    })
    // Last resort fallback
    try {
      await playFallbackMessage(callControlId, 'We apologize, but we are unable to connect your call at this time.')
    } catch (fallbackError) {
      logger.error('Fallback message playback also failed', {
        callControlId,
        error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      })
    }
  }
}

/**
 * Play fallback message to caller using Telnyx Call Control API
 */
async function playFallbackMessage(callControlId: string, message: string): Promise<void> {
  const telnyxApiKey = process.env.TELNYX_API_KEY
  if (!telnyxApiKey) {
    logger.error('Cannot play fallback message - Telnyx API key not configured', { callControlId })
    return
  }

  try {
    // Use Telnyx Call Control to play text-to-speech message
    await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/speak`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payload: message,
        voice: 'female',
        language: 'en-US'
      })
    })

    // Hang up after message
    await new Promise(resolve => setTimeout(resolve, 3000))
    await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    logger.info('Fallback message played and call ended', { callControlId, message })
  } catch (error) {
    logger.error('Failed to play fallback message', {
      callControlId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Forward call to escalation phone number
 */
async function forwardToEscalation(callControlId: string, escalationPhone: string): Promise<void> {
  const telnyxApiKey = process.env.TELNYX_API_KEY
  if (!telnyxApiKey) {
    logger.error('Cannot forward to escalation - Telnyx API key not configured', { callControlId })
    return
  }

  try {
    // Normalize escalation phone
    const normalizedEscalation = normalizePhoneForLookup(escalationPhone)
    if (!normalizedEscalation) {
      logger.warn('Invalid escalation phone number format', {
        callControlId,
        escalationPhone
      })
      await playFallbackMessage(callControlId, 'Please hold while we connect you.')
      return
    }

    // Transfer to escalation phone
    await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: normalizedEscalation,
        from: undefined // Use original caller ID
      })
    })

    logger.info('Call forwarded to escalation phone', {
      callControlId,
      escalationPhone: normalizedEscalation
    })
  } catch (error) {
    logger.error('Failed to forward to escalation phone', {
      callControlId,
      escalationPhone,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    // Fallback to message
    await playFallbackMessage(callControlId, 'Please hold while we connect you.')
  }
}

/**
 * Handle call events from Telnyx
 */
async function handleCallEvent(
  eventType: string,
  eventData: any,
  callControlId: string | undefined,
  phoneNumber: string | undefined,
  fromNumber: string | undefined
) {
  try {
    if (!callControlId) {
      logger.warn('Call event missing call_control_id', { eventType })
      return
    }

    // Bridge to Retell when call is initiated
    // This must happen BEFORE we create/update call records
    if (eventType === 'call.initiated') {
      // Don't await - let it run in background so we don't block webhook response
      bridgeCallToRetell(callControlId, phoneNumber, fromNumber).catch((error) => {
        logger.error('Background bridge to Retell failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          callControlId,
          phoneNumber
        })
      })
    }

    // Find existing call by call_control_id
    const { data: existingCall, error: findError } = await supabaseAdmin
      .from('calls')
      .select('id, business_id, call_status')
      .eq('call_id', callControlId)
      .single()

    // Determine call status based on event
    let callStatus: string
    switch (eventType) {
      case 'call.initiated':
        callStatus = 'initiated'
        break
      case 'call.answered':
        callStatus = 'answered'
        break
      case 'call.ended':
      case 'call.hangup':
        callStatus = 'completed'
        break
      default:
        callStatus = 'unknown'
    }

    // Extract call duration if available
    const duration = eventData.duration_seconds || eventData.duration || null

    if (existingCall) {
      // Update existing call
      const updateData: any = {
        call_status: callStatus,
        updated_at: new Date().toISOString()
      }

      if (duration && eventType === 'call.ended') {
        updateData.duration = duration
      }

      if (phoneNumber && !existingCall.business_id) {
        // Normalize phone number before lookup
        const normalizedPhone = normalizePhoneForLookup(phoneNumber)
        if (normalizedPhone) {
          // Try to find business by normalized phone number (check both fields)
          const { data: business } = await supabaseAdmin
            .from('businesses')
            .select('id')
            .or(`phone_number.eq.${normalizedPhone},phone.eq.${normalizedPhone}`)
            .single()

          if (business) {
            updateData.business_id = business.id
          }
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('calls')
        .update(updateData)
        .eq('id', existingCall.id)

      if (updateError) {
        logger.error('Failed to update call', {
          error: updateError.message,
          callId: existingCall.id,
          callControlId
        })
      } else {
        logger.info('Call updated', {
          callId: existingCall.id,
          callControlId,
          status: callStatus,
          duration
        })
      }
    } else {
      // Create new call record if initiated
      if (eventType === 'call.initiated') {
        // Normalize phone numbers before lookup and storage
        const normalizedPhoneNumber = phoneNumber ? normalizePhoneForLookup(phoneNumber) : null
        const normalizedFromNumber = fromNumber ? normalizePhoneForLookup(fromNumber) : null

        // Try to find business by normalized phone number
        let businessId: string | null = null
        if (normalizedPhoneNumber) {
          const { data: business } = await supabaseAdmin
            .from('businesses')
            .select('id')
            .or(`phone_number.eq.${normalizedPhoneNumber},phone.eq.${normalizedPhoneNumber}`)
            .single()

          if (business) {
            businessId = business.id
          }
        }

        const { error: insertError } = await supabaseAdmin
          .from('calls')
          .insert({
            business_id: businessId,
            call_id: callControlId,
            customer_phone: normalizedFromNumber || fromNumber, // Store normalized if available
            call_status: callStatus,
            duration: duration || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          logger.error('Failed to create call record', {
            error: insertError.message,
            callControlId
          })
        } else {
          logger.info('Call record created', {
            callControlId,
            businessId,
            status: callStatus
          })
        }
      }
    }

  } catch (error) {
    logger.error('Error handling call event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventType,
      callControlId
    })
  }
}



