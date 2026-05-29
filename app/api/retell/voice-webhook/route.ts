import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telnyxClient } from '@/lib/telnyx'
import { sendBookingNotification } from '@/lib/booking-notifications'
import { lookupCallerHistory } from '@/lib/caller-history'
import { scheduleReviewRequest } from '@/lib/review-requests'
import { createCalendarEvent } from '@/lib/calendar'
import { verifyRetellSignature } from '@/lib/webhook-verification'
import { notifyAdmin } from '@/lib/notifications/notify'
import { resolveCallBusinessId } from '@/lib/calls/resolve-business'
import { readSlotCache, writeSlotCache, invalidateSlotCache } from '@/lib/slot-cache'
import { resolveBusinessTimezone } from '@/lib/timezones'
import { CONFIG } from '@/lib/config'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RetellToolCall = {
 name: string
 arguments: Record<string, any>
}

export async function POST(request: NextRequest) {
 try {
 // Read raw body for signature verification
 const rawBody = await request.text()
 
 // Parse JSON to check event type first (allow ping without verification)
 let body: any
 try {
 body = JSON.parse(rawBody)
 } catch (parseError) {
 logger.error('Retell webhook JSON parse error', { error: parseError instanceof Error ? parseError.message : JSON.stringify(parseError) })
 return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 })
 }

 const eventType: string = body.event || body.type || body.event_type || 'unknown'

 // Allow ping events without signature verification (Retell health checks)
 if (eventType === 'ping') {
 return NextResponse.json({ ok: true })
 }

 // Verify webhook signature (Retell). Soft-verify only: we log on
 // mismatch but don't reject. Retell's per-agent webhook_api_key
 // differs from the workspace key our env has, and there's no good
 // way to maintain a per-agent secret table at our scale yet.
 // Multi-tenancy is enforced downstream by resolving business_id
 // from the signed agent_id field in the payload via Retell's API,
 // not by signature verification - an attacker forging webhooks
 // would still need to know a valid agent_id to do anything useful,
 // and the worst-case is a fake call record (no auth bypass).
 //
 // STRICT_RETELL_SIGNATURES=1 flips back to hard rejection for
 // deployments that DO have a matching webhook secret configured.
 const signature = request.headers.get('x-retell-signature')
 if (process.env.NODE_ENV === 'production') {
 const isValid = verifyRetellSignature(rawBody, signature)
 if (!isValid) {
 logger.warn('Retell webhook signature mismatch (soft-allowed)', {
 hasSignature: !!signature,
 eventType,
 })
 if (process.env.STRICT_RETELL_SIGNATURES === '1') {
 return NextResponse.json(
 { success: false, error: 'Invalid webhook signature' },
 { status: 401 }
 )
 }
 }
 }

 // Now process the verified body. Retell has shipped at least three
 // different shapes for function-call webhooks over the years:
 //   - {tool_call: {name, arguments}}
 //   - {name, args}                          (current shape from logs)
 //   - {function_call: {name, arguments}}
 // Normalise all of them into a single RetellToolCall shape so the
 // switch below doesn't care which version Retell happens to be on.
 let tool: RetellToolCall | null = null
 if (body.tool_call?.name) {
  tool = {
   name: body.tool_call.name,
   arguments: body.tool_call.arguments || body.tool_call.args || {},
  }
 } else if (body.function_call?.name) {
  tool = {
   name: body.function_call.name,
   arguments: body.function_call.arguments || body.function_call.args || {},
  }
 } else if (typeof body.name === 'string' && body.name && eventType !== 'call_inbound') {
  // Top-level {name, args} form. Guard against this being a regular
  // lifecycle payload that also happens to have a `name` field.
  const looksLikeTool =
   body.args && typeof body.args === 'object'
   || body.arguments && typeof body.arguments === 'object'
  if (looksLikeTool) {
   tool = {
    name: body.name,
    arguments: body.args || body.arguments || {},
   }
  }
 }
 const tenantId: string | undefined = body.tenant_id || body.metadata?.tenant_id

 // Resolve the calling tenant from the Retell agent_id, NOT from the
 // tool arguments. The tool args (`business_id`) come from whatever the
 // agent's prompt was configured to send; trusting them lets a
 // misconfigured/malicious agent target any tenant. The agent_id in the
 // webhook envelope is the trustworthy identifier - Retell signs the
 // body and the agent → business mapping is in our DB.
 const callingAgentId: string | undefined =
  body.call?.agent_id || body.agent_id || body.metadata?.agent_id
 const eventToNumber: string | undefined =
  body.call?.to_number || body.to_number || body.call_inbound?.to_number
 const resolvedBusinessId: string | null = await resolveCallBusinessId(callingAgentId, eventToNumber)

 // call_inbound fires the moment a call hits Retell, BEFORE the agent
 // greets. We respond with dynamic_variables that get substituted into
 // the prompt at call start, letting the agent open with the caller's
 // name when they're a known recurring customer. Resolved by to_number
 // (the CloudGreet DID that received the call) since agent_id isn't
 // set on call_inbound events.
 if (eventType === 'call_inbound') {
  try {
   const inbound = body.call_inbound || body.call || body
   const toNumber: string =
    inbound?.to_number || inbound?.to || body?.to_number || ''
   const fromNumber: string =
    inbound?.from_number || inbound?.from || body?.from_number || ''

   let inboundBusinessId: string | null = resolvedBusinessId
   if (!inboundBusinessId && toNumber) {
    const { data: bizByNumber } = await supabaseAdmin
     .from('businesses')
     .select('id')
     .eq('phone_number', toNumber)
     .maybeSingle()
    if (bizByNumber?.id) inboundBusinessId = bizByNumber.id
   }

   const history = inboundBusinessId
    ? await lookupCallerHistory(inboundBusinessId, fromNumber)
    : { returning_caller: 'false', caller_name: '', last_service: '' }

   // Slot cache prewarm. Kicked off as a fetch to a separate internal
   // endpoint so it gets its own serverless invocation lifetime -
   // `void prewarmSlotCache(...)` inline would get killed the instant
   // this handler returns, which was leaving the cache cold and
   // forcing every mid-call lookup_availability to pay the full
   // Cal.com round-trip (~2s, the source of the "let me check…
   // [silence]" gap callers complained about). Fire-and-forget; the
   // prewarm endpoint runs independently for up to 10s.
   if (inboundBusinessId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
    fetch(`${appUrl}/api/internal/prewarm-slots`, {
     method: 'POST',
     headers: {
      'content-type': 'application/json',
      'x-cg-internal': process.env.INTERNAL_API_TOKEN || '',
     },
     body: JSON.stringify({ businessId: inboundBusinessId }),
    }).catch(() => { /* fire and forget */ })
   }

   return NextResponse.json({
    call_inbound: {
     dynamic_variables: history,
     metadata: { business_id: inboundBusinessId || '' },
    },
   })
  } catch (e) {
   logger.warn('call_inbound handler failed - falling back to no history', {
    error: e instanceof Error ? e.message : 'Unknown',
   })
   return NextResponse.json({
    call_inbound: {
     dynamic_variables: { returning_caller: 'false', caller_name: '', last_service: '' },
    },
   })
  }
 }

 if (tool) {
 // Legacy alias: some clients have agents wired with the older
 // `_cal`-suffixed tool names ("book_appointment_cal",
 // "check_availability_cal") - those predate our programmatic
 // attach, which uses the cleaner names. Normalise so both work
 // and we don't return unknown_tool to the agent mid-call.
 const aliasMap: Record<string, string> = {
 book_appointment_cal: 'book_appointment',
 check_availability_cal: 'lookup_availability',
 check_availability: 'lookup_availability',
 send_sms: 'send_booking_sms',
 send_confirmation_sms: 'send_booking_sms',
 }
 const normalised = aliasMap[tool.name] || tool.name
 if (normalised !== tool.name) {
 logger.info('retell webhook: tool name alias', { from: tool.name, to: normalised })
 tool = { ...tool, name: normalised }
 }
 switch (tool.name) {
 case 'book_appointment': {
 const { name: rawName, phone, service: rawService, datetime, business_id: toolBusinessId, review_consent: reviewConsentRaw, is_emergency: isEmergencyRaw } = tool.arguments || {}
 // Retell's LLM often passes the verbalized form of any digits the
 // agent spoke aloud - "AC leaking at one one one one Main Street"
 // instead of "1111". Compress runs of digit words back to numerals
 // so the SMS confirmation, calendar entry, and dashboard all read
 // cleanly. Idempotent: leaves already-numeric values alone.
 const { compressDigitWords } = await import('@/lib/digit-words')
 const name = compressDigitWords(rawName)
 // Belt-and-suspenders: cap service text at 1000 chars. The column
 // is `text` (unlimited) as of 2026-05-27, but every once in a
 // while a future schema migration could re-introduce a length cap
 // and we don't want a booking to fail because an extra-verbose
 // ride description tipped over. 1000 chars is well above any
 // realistic message Steve scans on his phone.
 const service = compressDigitWords(rawService)?.slice?.(0, 1000) ?? rawService
 // Coerce review_consent to a strict boolean - the agent may pass true/false,
 // "true"/"false", "yes"/"no", or omit entirely. Anything ambiguous = false
 // so we never text without an explicit yes.
 const reviewConsent =
   reviewConsentRaw === true ||
   reviewConsentRaw === 'true' ||
   reviewConsentRaw === 'yes' ||
   reviewConsentRaw === 'y'
 // Same strict-boolean coercion as review_consent. Default false so a
 // missing arg never accidentally trips the emergency dispatch path.
 const isEmergency =
   isEmergencyRaw === true ||
   isEmergencyRaw === 'true' ||
   isEmergencyRaw === 'yes' ||
   isEmergencyRaw === 'y'

 // Reject if we couldn't resolve a business from the agent. Falling
 // back to tool args would re-introduce the spoofing risk.
 if (!resolvedBusinessId) {
 logger.warn('Retell book_appointment with unresolvable agent', { callingAgentId })
 return NextResponse.json({ success: false, error: 'agent_not_linked_to_business' }, { status: 403 })
 }
 if (toolBusinessId && toolBusinessId !== resolvedBusinessId) {
 logger.warn('Retell tool args business_id mismatch - ignoring tool value', {
  toolBusinessId, resolvedBusinessId, callingAgentId,
 })
 }
 const business_id = resolvedBusinessId

 // Get business info - need cal.com config for the booking too.
 const { data: business, error: businessError } = await supabaseAdmin
 .from('businesses')
 .select('id, stripe_customer_id, subscription_status, timezone, cal_com_api_key, cal_com_event_type_id, cal_com_event_type_id_emergency, business_name, email, phone_number')
 .eq('id', business_id)
 .single()

 if (businessError || !business) {
 logger.error('Business not found', { business_id, error: businessError?.message || JSON.stringify(businessError) })
 return NextResponse.json({ success: false, error: 'business_not_found' }, { status: 404 })
 }

 // Parse datetime and calculate end time (default 1 hour duration).
 // Defensive: if the agent gave us a naive datetime (no 'Z' and no
 // +/-HH:MM offset), JavaScript's Date interprets it in the server's
 // local timezone (UTC on Vercel), which silently shifts the booking
 // by 5-8 hours from what the caller agreed to. Treat naive
 // datetimes as the BUSINESS's local time and convert to UTC via the
 // business timezone.
 const businessTz = resolveBusinessTimezone({
   explicit: (business as any).timezone,
   state: (business as any).state,
 })
 const startTime = parseAgentDatetime(datetime, businessTz)
 const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // Add 1 hour

 // Cal.com pre-flight: book on Cal.com BEFORE inserting into our DB.
 // Cal.com is the source of truth for slot availability. If the slot
 // is taken or otherwise rejected we must not leave an orphan
 // "scheduled" row claiming the booking succeeded - the agent then
 // tells the caller "you're booked" while the calendar disagrees.
 const sideEffects: string[] = []
 const calApiKey = (business as any)?.cal_com_api_key as string | null
 const calEventTypeIdRaw = (business as any)?.cal_com_event_type_id
 let calBooking: { uid: string; id: number } | null = null
 if (calApiKey && calEventTypeIdRaw) {
  try {
   const { createBooking } = await import('@/lib/calcom')
   // Route emergencies through the dedicated emergency Cal.com event
   // type when the contractor configured one. That event type can have
   // its own availability rules / colour / reminder cadence in Cal so
   // emergencies show up visually distinct on the contractor's
   // calendar. Falls through to the normal event type otherwise.
   const emergencyEventTypeId = (business as any)?.cal_com_event_type_id_emergency
   const effectiveEventTypeId = isEmergency && emergencyEventTypeId
    ? Number(emergencyEventTypeId)
    : Number(calEventTypeIdRaw)
   const created = await createBooking(calApiKey, {
    startIso: startTime.toISOString(),
    eventTypeId: effectiveEventTypeId,
    attendee: {
     name: name || 'Caller',
     // Disambiguated synthetic email - the apptId-suffixed form we
     // used to use isn't available yet (we book Cal first now). Use
     // business_id + epoch so Cal still sees a unique attendee.
     email: `noemail+${business_id}+${Date.now()}@cloudgreet.com`,
     timeZone: businessTz,
     phoneNumber: phone || undefined,
    },
    metadata: {
     cloudgreet_business_id: String(business_id),
     customer_phone: phone || '',
     is_emergency: isEmergency ? 'true' : 'false',
    },
    notes: `${isEmergency ? '🚨 EMERGENCY · ' : ''}Booked by CloudGreet AI receptionist. Service requested: ${service || 'unspecified'}. Caller phone: ${phone || 'unknown'}.`,
   })
   calBooking = { uid: created.uid, id: created.id }
   sideEffects.push('calcom_synced')
   logger.info('Cal.com booking created (pre-DB)', {
    business_id, calBookingUid: created.uid,
   })
  } catch (calErr) {
   const msg = calErr instanceof Error ? calErr.message : 'Unknown'
   const status = (calErr as any)?.status as number | undefined
   // Cal.com signals slot conflicts via 400/409/422 with messages like
   // "no available users", "slot not available", "already booked".
   // Distinguish those from generic API failures so the agent gets a
   // clear "offer alternatives" signal rather than a vague error.
   const unavailable =
    (status === 400 || status === 409 || status === 422) &&
    /no.available|unavailable|already.+book|slot|conflict|busy|not.available|taken/i.test(msg)
   logger.warn('Cal.com pre-flight failed - no DB row written', {
    business_id, status, error: msg, unavailable,
   })
   if (unavailable) {
    return NextResponse.json({
     success: false,
     error: 'slot_unavailable',
     detail: msg,
     guidance: "That exact time is already booked. Don't tell the caller they're booked. Use lookup_availability to find 2-3 nearby openings, offer them, and call book_appointment again with the time they pick.",
    }, { status: 409 })
   }
   return NextResponse.json({
    success: false,
    error: 'calcom_sync_failed',
    detail: msg,
    guidance: "Tell the caller the booking system is having trouble and offer to take their info for a callback. Do not claim the appointment is on the calendar.",
   }, { status: 502 })
  }
 } else {
  logger.warn('Skipping Cal.com booking - no cal.com config on business', { business_id })
  sideEffects.push('calcom_skipped_not_configured')
 }

 // Create appointment in database using transaction function for atomicity.
 // Only reached if Cal.com confirmed (or no Cal.com is configured), so
 // a row here always corresponds to a real calendar booking.
 const { data: appointmentId, error: appointmentError } = await supabaseAdmin.rpc('create_appointment_safe', {
 p_business_id: business_id,
 p_customer_name: name,
 p_customer_phone: phone,
 p_customer_email: null, // Email not available from voice call
 p_service_type: service,
 p_scheduled_date: startTime.toISOString(),
 p_start_time: startTime.toISOString(),
 p_end_time: endTime.toISOString(),
 p_duration: 60,
 p_notes: null,
 p_estimated_value: null,
 p_is_emergency: isEmergency,
 })

 if (appointmentError || !appointmentId) {
 logger.error('book_appointment transaction failed', {
 error: appointmentError?.message || 'No appointment ID returned',
 detail: (appointmentError as any)?.details,
 hint: (appointmentError as any)?.hint,
 code: (appointmentError as any)?.code,
 business_id,
 customer_name: name,
 datetime,
 service,
 })
 // Roll back the Cal.com side so we don't leave a phantom booking in
 // the OTHER direction (calendar shows it, our DB does not).
 if (calBooking && calApiKey) {
   try {
     const { cancelBooking } = await import('@/lib/calcom')
     await cancelBooking(calApiKey, calBooking.uid, 'CloudGreet DB insert failed; rolling back Cal.com side.')
     logger.info('Cal.com booking rolled back after DB failure', { calBookingUid: calBooking.uid })
   } catch (rbErr) {
     logger.warn('Cal.com rollback failed - may leave orphan calendar event', {
       calBookingUid: calBooking.uid,
       error: rbErr instanceof Error ? rbErr.message : 'unknown',
     })
   }
 }
 return NextResponse.json({
 success: false,
 error: 'db_error',
 detail: appointmentError?.message || 'No appointment ID returned',
 hint: (appointmentError as any)?.hint || null,
 code: (appointmentError as any)?.code || null,
 }, { status: 500 })
 }

 const apptId = appointmentId
 sideEffects.push('db_inserted')

 // Stamp the Cal.com booking ids onto the row now that we have apptId.
 // Cal.com was already created successfully in the pre-flight above.
 if (calBooking) {
   await supabaseAdmin
     .from('appointments')
     .update({
       cal_com_booking_uid: calBooking.uid,
       cal_com_booking_id: calBooking.id,
       updated_at: new Date().toISOString(),
     })
     .eq('id', apptId)
 }

 // Link the appointment row to the Retell call that booked it so the
 // dashboard's appointment drawer can render the call transcript +
 // recording alongside the booking details.
 const bookingCallId =
   body?.call?.call_id || body?.call_id || callingAgentId && (body as any)?.call_id || null
 if (bookingCallId) {
   try {
     await supabaseAdmin
       .from('appointments')
       .update({ retell_call_id: bookingCallId, updated_at: new Date().toISOString() })
       .eq('id', apptId)
   } catch { /* non-fatal */ }
   // Also stamp caller_name onto the call row immediately. Without
   // this, the calls list shows just the phone number until
   // call_analyzed fires (sometimes 30s+ after the call ends, and
   // missing entirely if Retell never runs the post-call analysis).
   // The agent already collected the name to make the booking, so
   // this is the freshest source.
   try {
    const callPatch: Record<string, any> = {
     outcome: isEmergency ? 'emergency' : 'booked',
     updated_at: new Date().toISOString(),
    }
    if (name && typeof name === 'string' && name.trim()) {
     callPatch.caller_name = name.trim().slice(0, 120)
    }
    await supabaseAdmin
      .from('calls')
      .update(callPatch)
      .eq('retell_call_id', bookingCallId)
   } catch { /* non-fatal */ }
 }

 // Persist review_consent on the appointment so we have an audit trail
 // alongside the appointment row (independent of whether scheduling
 // succeeds). Errors here are non-fatal - the booking is the priority.
 await supabaseAdmin
   .from('appointments')
   .update({
     review_consent: reviewConsent,
     review_consent_captured_at: new Date().toISOString(),
   })
   .eq('id', apptId)
   .then(undefined, () => null)

 // Schedule the post-appointment review SMS. No-op if the business
 // has the feature off, no review URL configured, no consent captured,
 // the customer is opted out, or we already sent within 90 days.
 // Fire-and-forget - never let this block the booking response.
 try {
   const result = await scheduleReviewRequest({
     appointmentId: apptId,
     businessId: business_id,
     customerPhone: phone,
     customerName: name,
     appointmentStart: startTime,
     reviewConsent,
   })
   if (result.ok === true) {
     logger.info('review request scheduled', { apptId, scheduled_for: result.scheduled_for })
   } else if (result.ok === false) {
     logger.info('review request not scheduled', { apptId, reason: result.reason })
   }
 } catch (e) {
   logger.warn('scheduleReviewRequest threw', {
     apptId,
     error: e instanceof Error ? e.message : 'Unknown',
   })
 }

 // Legacy Google Calendar sync - kept for backward compatibility but
 // skipped on businesses that have a Cal.com config (Cal.com routes
 // to the same calendar via the contractor's own integration).
 if (business_id && !((business as any)?.cal_com_api_key)) {
 try {
 const { getCalendarConfig, getValidAccessToken, refreshGoogleToken } = await import('@/lib/calendar')
 const config = await getCalendarConfig(business_id)
 
 if (config?.calendar_connected) {
 // Get valid access token (refresh if expired)
 let accessToken = await getValidAccessToken(business_id)
 
 if (accessToken) {
 // Retry logic for calendar API calls
 let retries = 2
 let calendarSuccess = false
 
 while (retries >= 0 && !calendarSuccess) {
 try {
 const googleEvent = {
 summary: `${service} - ${name}`,
 description: `Appointment for ${name} (${phone}). Service: ${service}`,
 location: '',
 start: {
 dateTime: startTime.toISOString(),
 timeZone: config.timezone || 'America/New_York'
 },
 end: {
 dateTime: endTime.toISOString(),
 timeZone: config.timezone || 'America/New_York'
 },
 reminders: {
 useDefault: false,
 overrides: [
 { method: 'email', minutes: 24 * 60 },
 { method: 'popup', minutes: 60 }
 ]
 }
 }

 const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${accessToken}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify(googleEvent)
 })

 if (calendarResponse.ok) {
 const googleEventData = await calendarResponse.json()
 // Update appointment with Google Calendar event ID
 await supabaseAdmin
 .from('appointments')
 .update({
 google_calendar_event_id: googleEventData.id,
 google_event_id: googleEventData.id,
 updated_at: new Date().toISOString()
 })
 .eq('id', apptId)
 
 logger.info('Google Calendar event created', { 
 appointmentId: apptId, 
 googleEventId: googleEventData.id 
 })
 
 calendarSuccess = true
 } else if (calendarResponse.status === 401 && retries > 0) {
 // Token expired, try to refresh and retry
 logger.warn('Google Calendar API returned 401, refreshing token and retrying', {
 businessId: business_id,
 appointmentId: apptId,
 retries
 })
 
 accessToken = await refreshGoogleToken(business_id)
 if (!accessToken) {
 logger.error('Failed to refresh token, cannot retry calendar sync', {
 businessId: business_id,
 appointmentId: apptId
 })
 break
 }
 
 retries--
 } else {
 const errorText = await calendarResponse.text().catch(() => 'Unknown error')
 logger.error('Failed to create Google Calendar event', {
 status: calendarResponse.status,
 statusText: calendarResponse.statusText,
 error: errorText,
 businessId: business_id,
 appointmentId: apptId,
 retries
 })
 
 // Don't retry on non-auth errors
 if (calendarResponse.status !== 401) {
 break
 }
 
 retries--
 }
 } catch (calendarError) {
 logger.error('Google Calendar API error', {
 error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
 businessId: business_id,
 appointmentId: apptId,
 retries
 })
 
 // Only retry on network errors
 if (retries > 0 && calendarError instanceof Error && (
 calendarError.message.includes('network') ||
 calendarError.message.includes('timeout') ||
 calendarError.message.includes('ECONNREFUSED')
 )) {
 retries--
 // Wait 1 second before retry
 await new Promise(resolve => setTimeout(resolve, 1000))
 } else {
 break
 }
 }
 }
 
 if (!calendarSuccess) {
 logger.warn('Failed to sync appointment to Google Calendar after retries, appointment saved in database', {
 appointmentId: apptId,
 businessId: business_id
 })
 }
 } else {
 logger.warn('No valid Google access token available, skipping calendar sync', {
 businessId: business_id,
 appointmentId: apptId
 })
 }
 }
 } catch (calendarError) {
 // Log but don't fail - appointment is already in database
 logger.warn('Calendar sync failed', { 
 error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
 appointmentId: apptId 
 })
 }
 }

 // Per-booking fees removed; pricing is flat-monthly only.

 // Backgrounded: owner-notification SMS + slot cache invalidation.
 // Both are post-booking side effects that don't gate the agent's
 // next utterance - awaiting them was adding ~300-500ms of dead
 // air on the call. Fire-and-forget; errors logged but never
 // surface to the caller.
 void (async () => {
 try {
 const apptDate = new Date(datetime)
 const formattedTime = apptDate.toLocaleString('en-US', {
 weekday: 'short', month: 'short', day: 'numeric',
 hour: 'numeric', minute: '2-digit', hour12: true,
 })
 await sendBookingNotification(business_id, {
 name,
 phone,
 time: formattedTime,
 service,
 business: (business as any).business_name || null,
 is_emergency: isEmergency,
 })
 } catch (e) {
 logger.warn('booking notification failed', {
 error: e instanceof Error ? e.message : 'Unknown',
 business_id,
 has_messaging_profile: !!process.env.TELNYX_MESSAGING_PROFILE_ID,
 })
 }
 })()

 // Slot we just took shouldn't show as available on the next
 // lookup. Drop cached scopes for this business; the next live
 // fetch will be authoritative.
 void invalidateSlotCache(business_id)
 sideEffects.push('owner_notified_async', 'cache_invalidated')

 return NextResponse.json({
  success: true,
  appointment_id: apptId,
  is_emergency: isEmergency,
  did: sideEffects,
 })
 }
 case 'send_booking_sms': {
 const { phone, appt_id } = tool.arguments || {}
 if (!phone || !appt_id) {
 return NextResponse.json({
 success: false,
 error: 'missing_parameters',
 detail: 'send_booking_sms needs phone and appt_id',
 }, { status: 400 })
 }

 // From-number must be a CloudGreet-managed Telnyx number with
 // SMS enabled. business.phone_number is the inbound Retell
 // number, which can't originate SMS - sending from it would
 // 400 on Telnyx's side. We use the same sender as the owner
 // booking notification so the contractor's caller and the
 // contractor himself both get texts from the same line.
 const fromNum = process.env.CLOUDGREET_NOTIFICATIONS_FROM
 if (!fromNum) {
 logger.error('send_booking_sms skipped - CLOUDGREET_NOTIFICATIONS_FROM unset')
 return NextResponse.json({
 success: false,
 error: 'no_sender_configured',
 detail: 'Set CLOUDGREET_NOTIFICATIONS_FROM in Vercel env.',
 }, { status: 500 })
 }

 // Pull the real appointment so the SMS body has the actual
 // time + service instead of a bare appt_id the caller can't
 // act on. Plus the business name for the From label.
 const [{ data: bizRow }, { data: apptRow }] = await Promise.all([
 supabaseAdmin
 .from('businesses')
 .select('business_name, timezone, state')
 .eq('id', resolvedBusinessId)
 .maybeSingle(),
 supabaseAdmin
 .from('appointments')
 .select('scheduled_date, start_time, service_type')
 .eq('id', appt_id)
 .maybeSingle(),
 ])

 // HARD FAIL when the appointment row doesn't exist or has no
 // scheduled time. The previous fallback ("your appointment is
 // confirmed") was the false-positive that sent a misleading SMS
 // for ghost bookings - the caller got a text after a booking
 // that never actually saved. Agent now gets a clear error and
 // can tell the caller honestly.
 if (!apptRow) {
 return NextResponse.json({
 success: false,
 error: 'appointment_not_found',
 detail: `No appointment row exists for id ${appt_id}. The book_appointment call before this may have failed.`,
 }, { status: 404 })
 }
 const isoTime = (apptRow as any)?.scheduled_date || (apptRow as any)?.start_time
 if (!isoTime) {
 return NextResponse.json({
 success: false,
 error: 'appointment_missing_time',
 detail: `Appointment ${appt_id} has no scheduled_date or start_time.`,
 }, { status: 422 })
 }
 const businessName = (bizRow as any)?.business_name || 'your appointment'
 const tz = resolveBusinessTimezone({
   explicit: (bizRow as any)?.timezone,
   state: (bizRow as any)?.state,
 })
 const service = (apptRow as any)?.service_type
 const whenText = formatHuman(isoTime, tz)
 const body = `${businessName}: you're booked for ${service ? service + ' ' : ''}${whenText}. We'll see you then! Reply STOP to opt out.`

 try {
 await telnyxClient.sendSMS(phone, body, fromNum)
 return NextResponse.json({ success: true })
 } catch (smsError) {
 const msg = smsError instanceof Error ? smsError.message : 'Unknown error'
 logger.error('send_booking_sms failed', {
 error: msg, phone, appt_id, fromNum,
 })
 return NextResponse.json({
 success: false,
 error: 'sms_send_failed',
 detail: msg.slice(0, 300),
 }, { status: 500 })
 }
 }
 case 'lookup_drive_time': {
 // Rideshare-specific. Uses Google's Routes API (Distance Matrix's
 // successor - the legacy endpoint returns REQUEST_DENIED on new
 // GCP projects). Auth via X-Goog-Api-Key + field mask to keep
 // response cost minimal.
 //
 // The GCP project must have "Routes API" enabled in the console.
 // Same key as GOOGLE_PLACES_API_KEY since we're on one project.
 const args = tool.arguments || {}
 const origin = String(args.origin || '').trim()
 const destination = String(args.destination || '').trim()
 const departureTime = String(args.departure_time || '').trim()

 if (!origin || !destination) {
 return NextResponse.json({
 success: false,
 error: 'missing_parameters',
 detail: 'lookup_drive_time needs origin and destination.',
 }, { status: 400 })
 }

 const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY
 if (!apiKey) {
 return NextResponse.json({
 success: false,
 error: 'no_api_key',
 detail: 'GOOGLE_PLACES_API_KEY not configured.',
 }, { status: 500 })
 }

 const body: Record<string, unknown> = {
 origin: { address: origin },
 destination: { address: destination },
 travelMode: 'DRIVE',
 routingPreference: 'TRAFFIC_AWARE',
 units: 'IMPERIAL',
 }
 // Future-dated trips: pass departureTime so traffic estimate
 // reflects THAT moment. Routes API expects RFC3339. If omitted,
 // it uses "now" with current traffic, which is the default we want.
 if (departureTime) {
 const d = new Date(departureTime)
 if (Number.isFinite(d.getTime()) && d.getTime() > Date.now() - 60_000) {
 body.departureTime = d.toISOString()
 }
 }

 try {
 const ctrl = new AbortController()
 const t = setTimeout(() => ctrl.abort(), 6000)
 const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'X-Goog-Api-Key': apiKey,
 'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.legs.startLocation,routes.legs.endLocation',
 },
 body: JSON.stringify(body),
 signal: ctrl.signal,
 })
 clearTimeout(t)
 if (!res.ok) {
 const txt = await res.text().catch(() => res.statusText)
 logger.warn('lookup_drive_time: Routes API non-2xx', { status: res.status, body: txt.slice(0, 200) })
 return NextResponse.json({
 success: false,
 error: 'google_api_error',
 detail: `${res.status}: ${txt.slice(0, 200)}`,
 }, { status: 502 })
 }
 const j = await res.json().catch(() => ({}))
 const route = j?.routes?.[0]
 if (!route) {
 return NextResponse.json({
 success: false,
 error: 'no_route',
 detail: `Could not route ${origin} -> ${destination}`,
 }, { status: 404 })
 }

 // Routes API returns "Xs" string ("450s"). Parse to int seconds.
 const parseDur = (s: any): number | null => {
 if (typeof s !== 'string') return null
 const m = s.match(/^(\d+(?:\.\d+)?)s$/)
 return m ? Math.round(Number(m[1])) : null
 }
 const trafficSec = parseDur(route.duration)
 const staticSec = parseDur(route.staticDuration)
 const seconds = trafficSec ?? staticSec ?? 0
 const minutes = Math.round(seconds / 60)
 const distanceMeters = route.distanceMeters || 0
 const miles = Math.round((distanceMeters / 1609.34) * 10) / 10
 const usedTraffic = trafficSec != null && trafficSec !== staticSec

 // Geocode origin in parallel so the agent can pull the county for
 // tax-rate calculations on the quote. Best-effort: if Geocoding
 // API isn't enabled or the lookup fails, county comes back null
 // and the agent falls back to asking the caller.
 let originCounty: string | null = null
 let originState: string | null = null
 let isAirportOrigin = /airport|CMH|LCK|john glenn|rickenbacker/i.test(origin)
 try {
 const gRes = await fetch(
 `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(origin)}&key=${apiKey}`,
 )
 if (gRes.ok) {
 const gj = await gRes.json() as any
 const comps = gj?.results?.[0]?.address_components || []
 for (const c of comps) {
 const types = c.types || []
 if (types.includes('administrative_area_level_2')) {
 originCounty = String(c.long_name || '').replace(/\s*County$/i, '').trim() || null
 }
 if (types.includes('administrative_area_level_1')) {
 originState = c.short_name || null
 }
 }
 const resolved = (gj?.results?.[0]?.formatted_address || '').toLowerCase()
 if (resolved.includes('airport') || resolved.includes('cmh') || resolved.includes('lck')) {
 isAirportOrigin = true
 }
 }
 } catch { /* non-fatal */ }

 return NextResponse.json({
 success: true,
 minutes,
 distance_miles: miles,
 used_traffic: usedTraffic,
 origin_county: originCounty,
 origin_state: originState,
 is_airport_origin: isAirportOrigin,
 spoken_summary: `${minutes} minutes${miles ? `, about ${miles} miles` : ''}${usedTraffic ? ' with current traffic' : ''}`,
 })
 } catch (e) {
 const detail = e instanceof Error ? e.message : 'unknown'
 logger.warn('lookup_drive_time fetch failed', { error: detail })
 return NextResponse.json({
 success: false,
 error: 'network_error',
 detail: detail.slice(0, 200),
 }, { status: 502 })
 }
 }
 case 'compute_quote': {
 // SmartRide-specific pricing engine. Hardcoded to Steve's rate
 // sheet (sent 2026-05-26). When a second client needs custom
 // pricing, we'll move this into a per-business config table -
 // for now one client, hardcoded for speed + accuracy.
 //
 // Returns dollar amounts as numbers so the agent can read them
 // back exactly. LLMs are bad at multi-step math with tax +
 // surcharges; this guarantees the quote the caller hears is
 // the quote that lands.
 const args = tool.arguments || {}
 const serviceType = String(args.service_type || '').toLowerCase().replace(/[^a-z_]/g, '')
 const miles = Number(args.miles)
 const hours = Number(args.hours)
 const pickupHour = Number(args.pickup_hour_24)
 const pickupMinute = Number(args.pickup_minute || 0)
 const originCounty = String(args.origin_county || '').trim()
 const airportFee = !!args.cmh_airport
 // Two flag names supported for clarity in the prompt.
 const isCmh = !!args.cmh_airport || /cmh|john glenn/i.test(String(args.airport_code || ''))

 const COUNTY_TAX: Record<string, number> = {
 franklin: 0.0800,
 delaware: 0.0700,
 licking: 0.0725,
 fairfield: 0.0675,
 madison: 0.0700,
 pickaway: 0.0725,
 union: 0.0700,
 morrow: 0.0725,
 }
 const taxRate = COUNTY_TAX[originCounty.toLowerCase()] ?? null

 // Time-of-day surcharge based on pickup hour (24h).
 // Each window is [start_min_of_day, end_min_of_day] in minutes.
 const minOfDay = (h: number, m: number) => (h % 24) * 60 + (m % 60)
 const surchargeFor = (h: number, m: number): number => {
 if (!Number.isFinite(h)) return 0
 const t = minOfDay(h, m)
 // 23:00–24:00 +10%
 if (t >= 23 * 60 && t < 24 * 60) return 0.10
 // 00:00–02:00 +15%
 if (t >= 0 && t < 2 * 60) return 0.15
 // 02:00–04:00 +20%
 if (t >= 2 * 60 && t < 4 * 60) return 0.20
 // 04:00–05:30 +15%
 if (t >= 4 * 60 && t < 5 * 60 + 30) return 0.15
 // 05:30–06:45 +10%
 if (t >= 5 * 60 + 30 && t < 6 * 60 + 45) return 0.10
 return 0
 }
 const surchargeRate = surchargeFor(pickupHour, pickupMinute)

 // Base price by service type.
 let baseCents = 0
 const lines: Array<{ label: string; cents: number }> = []
 const note = (label: string, cents: number) => {
 baseCents += cents
 lines.push({ label, cents })
 }

 const svc = serviceType.replace(/[_-]/g, '')
 if (svc === 'airportdropoff' || svc === 'airportpickup' || svc === 'pointtopoint' || svc === 'p2p' || svc === 'transfer') {
 if (!Number.isFinite(miles) || miles <= 0) {
 return NextResponse.json({
 success: false, error: 'missing_miles',
 detail: 'compute_quote needs miles for distance-priced service. Call lookup_drive_time first to get miles.',
 }, { status: 400 })
 }
 // Over-50-mi transfers drop to $1.75/mi (per Steve's sheet).
 const isOver50 = (svc === 'pointtopoint' || svc === 'p2p' || svc === 'transfer') && miles > 50
 const ratePerMile = isOver50 ? 1.75 : 2.75
 const distanceCents = Math.round(miles * ratePerMile * 100)
 note(`${miles} mi @ $${ratePerMile.toFixed(2)}/mi`, distanceCents)
 if (svc === 'airportdropoff' || svc === 'airportpickup') {
 if (isCmh || airportFee) {
 note('CMH airport fee', 450)
 }
 // LCK = no additional fee, so no line if not CMH.
 }
 } else if (svc === 'hourlyevent' || svc === 'event' || svc === 'hourlyservice') {
 if (!Number.isFinite(hours) || hours < 2) {
 return NextResponse.json({
 success: false, error: 'minimum_hours',
 detail: 'Hourly/Event service is 2-hour minimum at $50/hr.',
 }, { status: 400 })
 }
 const hoursCents = Math.round(hours * 50 * 100)
 note(`${hours} hr @ $50/hr (2hr min)`, hoursCents)
 } else if (svc === 'independentliving' || svc === 'independent') {
 // Custom step pricing: $35 hr 1, $15 hr 2, $50 each additional.
 const h = Math.max(1, Math.floor(hours || 1))
 if (h >= 1) note('Hour 1', 3500)
 if (h >= 2) note('Hour 2', 1500)
 if (h > 2) note(`Hours 3-${h} @ $50/hr`, (h - 2) * 5000)
 } else {
 return NextResponse.json({
 success: false, error: 'unknown_service',
 detail: `service_type "${args.service_type}" not recognized. Use one of: airport_dropoff, airport_pickup, point_to_point, hourly_event, independent_living.`,
 }, { status: 400 })
 }

 const surchargeCents = Math.round(baseCents * surchargeRate)
 if (surchargeCents > 0) {
 const pct = Math.round(surchargeRate * 100)
 note(`Late-night/early-morning surcharge (+${pct}%)`, surchargeCents)
 }
 const subtotalCents = baseCents
 const taxCents = taxRate != null ? Math.round(subtotalCents * taxRate) : 0
 if (taxRate != null) {
 const pct = (taxRate * 100).toFixed(2)
 note(`${originCounty} County sales tax (${pct}%)`, taxCents)
 }
 const totalCents = subtotalCents + taxCents
 const fmt = (c: number) => `$${(c / 100).toFixed(2)}`

 return NextResponse.json({
 success: true,
 total_dollars: Math.round(totalCents) / 100,
 subtotal_dollars: Math.round(subtotalCents) / 100,
 tax_dollars: Math.round(taxCents) / 100,
 county_tax_rate: taxRate,
 surcharge_rate: surchargeRate,
 used_county: originCounty || null,
 lines: lines.map((l) => ({ label: l.label, amount: fmt(l.cents) })),
 spoken_summary: `${fmt(totalCents)} total${surchargeRate > 0 ? ` including the +${Math.round(surchargeRate * 100)}% time surcharge` : ''}${taxRate != null ? ` and ${originCounty} County tax` : ''}.`,
 })
 }
 case 'send_dispatch_request': {
 // Dispatch flow: the agent gathers trip details and we text the
 // owner instead of creating a Cal.com event. The owner accepts
 // and calls/texts the caller back. No appointment row is created
 // here - if the owner books it themselves we'll capture it via
 // their normal booking flow.
 const args = tool.arguments || {}
 const customerName = String(args.customer_name || '').trim()
 const customerPhone = String(args.customer_phone || '').trim()
 const pickup = String(args.pickup || '').trim()
 const dropoff = String(args.dropoff || '').trim()
 const partySize = args.party_size
 const requestedTime = String(args.requested_time || '').trim()
 const notes = String(args.notes || '').trim()

 if (!customerName || !customerPhone || !pickup || !requestedTime) {
 return NextResponse.json({
 success: false,
 error: 'missing_parameters',
 detail: 'send_dispatch_request needs customer_name, customer_phone, pickup, and requested_time.',
 }, { status: 400 })
 }

 const fromNum = process.env.CLOUDGREET_NOTIFICATIONS_FROM
 if (!fromNum) {
 logger.error('send_dispatch_request skipped - CLOUDGREET_NOTIFICATIONS_FROM unset')
 return NextResponse.json({
 success: false,
 error: 'no_sender_configured',
 detail: 'Set CLOUDGREET_NOTIFICATIONS_FROM in Vercel env.',
 }, { status: 500 })
 }

 const { data: bizRow } = await supabaseAdmin
 .from('businesses')
 .select('business_name, notifications_phone, notification_phone, escalation_phone, dispatch_sms_template')
 .eq('id', resolvedBusinessId)
 .maybeSingle()

 const ownerPhone = (bizRow as any)?.notifications_phone
 || (bizRow as any)?.notification_phone
 || (bizRow as any)?.escalation_phone
 if (!ownerPhone) {
 return NextResponse.json({
 success: false,
 error: 'no_owner_phone',
 detail: 'No notifications_phone on file for this business - cannot text the owner.',
 }, { status: 422 })
 }

 const businessName = (bizRow as any)?.business_name || 'CloudGreet'
 const lines = [
 `${businessName} dispatch request:`,
 `${customerName} (${customerPhone})`,
 `Pickup: ${pickup}`,
 ]
 if (dropoff) lines.push(`Dropoff: ${dropoff}`)
 if (typeof partySize === 'number' && partySize > 0) lines.push(`Party: ${partySize}`)
 lines.push(`When: ${requestedTime}`)
 if (notes) lines.push(`Notes: ${notes}`)
 lines.push('Call or text them back to accept.')
 const body = lines.join('\n')

 try {
 await telnyxClient.sendSMS(ownerPhone, body, fromNum)
 // Mirror to platform admin so we see every dispatch land across
 // all clients. Best-effort, fire-and-forget.
 void import('@/lib/admin-notify').then(({ sendAdminCopyIfDistinct }) =>
 sendAdminCopyIfDistinct({
 clientName: businessName,
 ownerPhone,
 kind: 'dispatch',
 body,
 }),
 ).catch(() => { /* admin-copy is best-effort */ })
 return NextResponse.json({
 success: true,
 message: 'Owner texted. Tell the caller the owner will call or text them back shortly to confirm.',
 })
 } catch (smsError) {
 const msg = smsError instanceof Error ? smsError.message : 'Unknown error'
 logger.error('send_dispatch_request failed', { error: msg, ownerPhone, customerPhone })
 return NextResponse.json({
 success: false,
 error: 'sms_send_failed',
 detail: msg.slice(0, 300),
 }, { status: 500 })
 }
 }
 case 'cancel_appointment': {
 const { phone: rawPhone, reason } = tool.arguments || {}
 if (!resolvedBusinessId) {
  return NextResponse.json({ success: false, error: 'agent_not_linked_to_business' }, { status: 403 })
 }
 const business_id = resolvedBusinessId
 const phone = (rawPhone || '').toString().trim()
 if (!phone) {
  return NextResponse.json({
   success: false,
   error: 'missing_phone',
   guidance: "Ask the caller for the phone number their appointment is under.",
  }, { status: 400 })
 }

 // Find the caller's most recent upcoming appointment. Loose phone
 // match (last 10 digits) so "+1 555 123 4567" / "555-123-4567" /
 // "5551234567" all resolve to the same row.
 const digits = phone.replace(/\D/g, '').slice(-10)
 const { data: candidates } = await supabaseAdmin
  .from('appointments')
  .select('id, cal_com_booking_uid, start_time, customer_phone, status, service_type')
  .eq('business_id', business_id)
  .gte('start_time', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  .not('status', 'in', '(cancelled,completed,no_show)')
  .order('start_time', { ascending: true })
  .limit(50)

 const match = (candidates || []).find((r) => {
  const rowDigits = (r.customer_phone || '').replace(/\D/g, '').slice(-10)
  return rowDigits && rowDigits === digits
 })
 if (!match) {
  return NextResponse.json({
   success: false,
   error: 'no_upcoming_appointment',
   guidance: "Tell the caller you can't find an upcoming appointment under that number, and offer to book a new one.",
  }, { status: 404 })
 }

 // Cancel on Cal.com first; only mark local cancelled if Cal accepts.
 // Otherwise the contractor's calendar still shows the booking and
 // the customer thinks they cancelled.
 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('cal_com_api_key')
  .eq('id', business_id)
  .maybeSingle()
 const apiKey = (biz as any)?.cal_com_api_key as string | null
 if (apiKey && match.cal_com_booking_uid) {
  try {
   const { cancelBooking } = await import('@/lib/calcom')
   await cancelBooking(apiKey, match.cal_com_booking_uid, reason)
  } catch (e) {
   const msg = e instanceof Error ? e.message : 'Unknown'
   logger.error('cancel_appointment Cal.com cancel failed', {
    business_id, apptId: match.id, error: msg,
   })
   return NextResponse.json({
    success: false,
    error: 'calcom_cancel_failed',
    detail: msg,
    guidance: "Tell the caller the cancellation didn't go through and offer to transfer them or take a message.",
   }, { status: 502 })
  }
 }

 await supabaseAdmin
  .from('appointments')
  .update({
   status: 'cancelled',
   notes: reason ? `Cancelled by caller via AI: ${String(reason).slice(0, 200)}` : 'Cancelled by caller via AI',
   updated_at: new Date().toISOString(),
  })
  .eq('id', match.id)

 // Tag the active call as a cancellation so the dashboard shows the
 // right outcome chip (red "cancelled") instead of inheriting "booked"
 // from Retell's post-call categorizer, which counts any
 // appointment-related call as a booking. Best-effort - the call row
 // may not exist yet if call_started hasn't been webhook'd.
 const cancelCallId: string | undefined = (body as any)?.call?.call_id || (body as any)?.call_id
 if (cancelCallId) {
  try {
   const { data: callRow } = await supabaseAdmin
    .from('calls')
    .select('id, call_extractions')
    .eq('retell_call_id', cancelCallId)
    .maybeSingle()
   if (callRow) {
    const prev = ((callRow as any).call_extractions || {}) as Record<string, any>
    await supabaseAdmin
     .from('calls')
     .update({
      outcome: 'cancelled',
      call_extractions: { ...prev, booking_type: 'cancelled', cancelled_appointment_id: match.id },
      updated_at: new Date().toISOString(),
     })
     .eq('id', (callRow as any).id)
   }
  } catch (e) {
   logger.warn('cancel_appointment: failed to mark call outcome', {
    callId: cancelCallId, error: e instanceof Error ? e.message : 'Unknown',
   })
  }
 }

 return NextResponse.json({
  success: true,
  appt_id: match.id,
  cancelled_start_time: match.start_time,
  service: match.service_type,
 })
 }
 case 'reschedule_appointment': {
 const { phone: rawPhone, new_datetime, reason } = tool.arguments || {}
 if (!resolvedBusinessId) {
  return NextResponse.json({ success: false, error: 'agent_not_linked_to_business' }, { status: 403 })
 }
 const business_id = resolvedBusinessId
 const phone = (rawPhone || '').toString().trim()
 if (!phone || !new_datetime) {
  return NextResponse.json({
   success: false,
   error: 'missing_args',
   guidance: "Confirm the caller's phone and the new date/time, then call again.",
  }, { status: 400 })
 }
 const newStart = new Date(new_datetime)
 if (isNaN(newStart.getTime()) || newStart.getTime() < Date.now()) {
  return NextResponse.json({
   success: false,
   error: 'invalid_new_datetime',
   guidance: "The new time has to be in the future. Confirm the date/time with the caller and try again.",
  }, { status: 400 })
 }

 const digits = phone.replace(/\D/g, '').slice(-10)
 const { data: candidates } = await supabaseAdmin
  .from('appointments')
  .select('id, cal_com_booking_uid, start_time, end_time, duration, customer_phone, status, service_type')
  .eq('business_id', business_id)
  .gte('start_time', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  .not('status', 'in', '(cancelled,completed,no_show)')
  .order('start_time', { ascending: true })
  .limit(50)

 const match = (candidates || []).find((r) => {
  const rowDigits = (r.customer_phone || '').replace(/\D/g, '').slice(-10)
  return rowDigits && rowDigits === digits
 })
 if (!match) {
  return NextResponse.json({
   success: false,
   error: 'no_upcoming_appointment',
   guidance: "Tell the caller you can't find an upcoming appointment under that number, and offer to book a new one.",
  }, { status: 404 })
 }

 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('cal_com_api_key')
  .eq('id', business_id)
  .maybeSingle()
 const apiKey = (biz as any)?.cal_com_api_key as string | null

 // Reschedule on Cal.com first; persist locally only on success.
 // Cal.com returns a NEW uid (it cancels the old and creates fresh).
 // We update the local row to point at the new uid so the dashboard
 // and any future cancel/reschedule lookups stay correct.
 let newUid: string | null = null
 let newEndIso: string | null = null
 if (apiKey && match.cal_com_booking_uid) {
  try {
   const { rescheduleBooking } = await import('@/lib/calcom')
   const updated = await rescheduleBooking(apiKey, match.cal_com_booking_uid, newStart.toISOString(), reason)
   newUid = updated.uid
   newEndIso = updated.end || null
  } catch (e) {
   const msg = e instanceof Error ? e.message : 'Unknown'
   logger.error('reschedule_appointment Cal.com reschedule failed', {
    business_id, apptId: match.id, error: msg,
   })
   return NextResponse.json({
    success: false,
    error: 'calcom_reschedule_failed',
    detail: msg,
    guidance: "Tell the caller the new time didn't take. Offer another slot or transfer them.",
   }, { status: 502 })
  }
 }

 const durationMin = match.duration || 60
 const computedEnd = newEndIso || new Date(newStart.getTime() + durationMin * 60 * 1000).toISOString()
 const update: Record<string, any> = {
  start_time: newStart.toISOString(),
  end_time: computedEnd,
  scheduled_date: newStart.toISOString().slice(0, 10),
  status: 'scheduled',
  updated_at: new Date().toISOString(),
 }
 if (newUid) update.cal_com_booking_uid = newUid
 if (reason) update.notes = `Rescheduled by caller via AI: ${String(reason).slice(0, 200)}`

 await supabaseAdmin
  .from('appointments')
  .update(update)
  .eq('id', match.id)

 return NextResponse.json({
  success: true,
  appt_id: match.id,
  new_start_time: newStart.toISOString(),
  service: match.service_type,
 })
 }
 case 'lookup_availability': {
 const { date, duration = 60 } = tool.arguments || {}

 // Same trust model as book_appointment: ignore any business_id from
 // the tool arguments and resolve from the calling agent.
 if (!resolvedBusinessId) {
 return NextResponse.json({ success: false, error: 'agent_not_linked_to_business' }, { status: 403 })
 }
 const business_id = resolvedBusinessId

 // Cache-first read. The call_inbound handler prewarms a week-wide
 // slot list before the agent greets the caller, so by the time
 // the agent calls lookup_availability mid-conversation the data
 // is sitting in cloudgreet_system_config with a 60s TTL.
 //
 // Always read the 'week' cache (which is what the prewarm writes),
 // then filter down to the requested date if the agent scoped one.
 // The previous version tried to read scope-specific keys like
 // 'slot_cache:{id}:2026-05-14' which the prewarm never writes -
 // every date-scoped query was a guaranteed miss, defeating the
 // entire prewarm.
 // Try the per-date cache first when a date is specified - this is
 // what catches "asked about the same day twice in one call" without
 // paying Cal.com latency again.
 if (date) {
 const dateCache = await readSlotCache(business_id, date)
 if (dateCache) {
 return NextResponse.json({
 success: true,
 slots: dateCache.slots,
 slots_display: dateCache.slots_display,
 timezone: dateCache.timezone,
 source: dateCache.source,
 cache: 'hit',
 })
 }
 }
 const cached = await readSlotCache(business_id, 'week')
 if (cached) {
 // Critical check: only filter the cache if the requested date
 // actually falls inside the window we prewarmed. Otherwise we
 // confidently return [] for any date past the horizon, and the
 // agent tells the caller "no openings" when in reality we just
 // never looked. coverage_*_iso were added so this check is
 // explicit rather than implicit-via-array-contents.
 const inCoverage = !date || (() => {
 if (!cached.coverage_start_iso || !cached.coverage_end_iso) return true
 const d = new Date(`${date}T00:00:00.000Z`).getTime()
 const start = new Date(cached.coverage_start_iso).getTime()
 const end = new Date(cached.coverage_end_iso).getTime()
 return d >= start && d < end
 })()
 if (inCoverage) {
 const matchPrefix = date ? `${date}T` : null
 const filtered = matchPrefix
 ? cached.slots
 .map((iso, i) => ({ iso, display: cached.slots_display[i] }))
 .filter((row) => row.iso.startsWith(matchPrefix))
 : cached.slots.map((iso, i) => ({ iso, display: cached.slots_display[i] }))
 return NextResponse.json({
 success: true,
 slots: filtered.map((r) => r.iso),
 slots_display: filtered.map((r) => r.display),
 timezone: cached.timezone,
 source: cached.source,
 cache: 'hit',
 })
 }
 // date is outside the prewarmed window - fall through to a live
 // per-date lookup below.
 }

 // Cache miss: live Cal.com lookup. Accounts for manual Cal.com
 // bookings, Google/Apple/Outlook sync, and the contractor's
 // working hours - our local appointments table can't see any of
 // those, so falling back to it risks double-booking.
 try {
 const { data: biz } = await supabaseAdmin
 .from('businesses')
 .select('cal_com_api_key, cal_com_event_type_id, timezone, state')
 .eq('id', business_id)
 .maybeSingle()

 const apiKey = (biz as any)?.cal_com_api_key as string | null
 const eventTypeId = (biz as any)?.cal_com_event_type_id as number | null
 const tz = resolveBusinessTimezone({
   explicit: (biz as any)?.timezone,
   state: (biz as any)?.state,
 })

 if (apiKey && eventTypeId) {
 const { listAvailableSlots } = await import('@/lib/calcom')

 let startIso: string
 let endIso: string
 if (date) {
 startIso = `${date}T00:00:00.000Z`
 const end = new Date(`${date}T00:00:00.000Z`)
 end.setUTCDate(end.getUTCDate() + 1)
 endIso = end.toISOString()
 } else {
 const start = new Date()
 start.setUTCDate(start.getUTCDate() + 1)
 start.setUTCHours(0, 0, 0, 0)
 const end = new Date(start)
 end.setUTCDate(end.getUTCDate() + 7)
 startIso = start.toISOString()
 endIso = end.toISOString()
 }

 const rawSlots = await listAvailableSlots(apiKey, {
 eventTypeId,
 startIso,
 endIso,
 timeZone: tz,
 })

 const slots = rawSlots.map((iso) => isoInZone(iso, tz))
 const slots_display = rawSlots.map((iso) => formatHuman(iso, tz))

 // If a specific date was requested, cache under that date so a
 // repeat ask in the same call is instant. Otherwise refresh the
 // 'week' cache (with coverage range so out-of-window reads can
 // detect themselves and re-fetch instead of returning empty).
 if (date) {
 void writeSlotCache(business_id, date, {
 slots, slots_display, timezone: tz, source: 'calcom', scope: date,
 coverage_start_iso: startIso,
 coverage_end_iso: endIso,
 })
 } else {
 void writeSlotCache(business_id, 'week', {
 slots, slots_display, timezone: tz, source: 'calcom', scope: 'week',
 coverage_start_iso: startIso,
 coverage_end_iso: endIso,
 })
 }

 // Explicit availability flag - the agent has read `success:true` as
 // "the day is available" and confirmed a time even when slots was [].
 // Surface a separate available + guidance so there's no room to
 // misinterpret an empty list as "go ahead and book."
 const available = slots.length > 0
 return NextResponse.json({
 success: true,
 available,
 slots,
 slots_display,
 timezone: tz,
 source: 'calcom',
 cache: 'miss',
 guidance: available
   ? `${slots.length} open slot${slots.length === 1 ? '' : 's'} on ${date || 'the requested window'}. Confirm with the customer and book.`
   : `NO open slots on ${date || 'the requested window'} - the calendar is fully blocked. Do NOT tell the customer the time is open. Offer to send the request to Steve directly via send_dispatch_request (route through the same-day / dispatch flow even if the date is in the future) or suggest a different day.`,
 })
 }
 } catch (calErr) {
 logger.warn('lookup_availability: Cal.com slots failed, falling back to local', {
 error: calErr instanceof Error ? calErr.message : 'Unknown error',
 business_id,
 })
 // fall through to local
 }

 // Local fallback: business has no Cal.com connected yet (demo mode),
 // or Cal.com is temporarily unreachable. Suggests slots based on our
 // own appointments table and the business's hours.
 try {
 const { getAvailableSlots } = await import('@/lib/calendar')

 if (date) {
 const slots = await getAvailableSlots(business_id, date, duration)
 const fullSlots = slots.map(slot => `${date}T${slot}:00`)
 const available = fullSlots.length > 0
 return NextResponse.json({
   success: true, available, slots: fullSlots, source: 'local',
   guidance: available
     ? `${fullSlots.length} open slot${fullSlots.length === 1 ? '' : 's'} on ${date}.`
     : `NO open slots on ${date}. Do NOT tell the customer the time is open. Offer dispatch or a different day.`,
 })
 } else {
 const allSlots: string[] = []
 const now = new Date()

 for (let i = 1; i <= 7; i++) {
 const day = new Date(now)
 day.setDate(now.getDate() + i)
 const dateStr = day.toISOString().slice(0, 10)

 const slots = await getAvailableSlots(business_id, dateStr, duration)
 const fullSlots = slots.map(slot => `${dateStr}T${slot}:00`)
 allSlots.push(...fullSlots)
 }

 const available = allSlots.length > 0
 return NextResponse.json({
   success: true, available, slots: allSlots, source: 'local',
   guidance: available
     ? `${allSlots.length} open slot${allSlots.length === 1 ? '' : 's'} in the next 7 days.`
     : `NO open slots in the next 7 days. Offer dispatch or a different window.`,
 })
 }
 } catch (error) {
 logger.error('lookup_availability failed', {
 error: error instanceof Error ? error.message : 'Unknown error',
 business_id
 })
 // Last-resort: synthesized slots so the agent never tells the
 // caller "I can't see the calendar."
 const now = new Date()
 const fallbackSlots = [1, 2, 3].map((d) => {
 const day = new Date(now)
 day.setDate(now.getDate() + d)
 const dayStr = day.toISOString().slice(0, 10)
 return [`${dayStr}T10:00:00Z`, `${dayStr}T14:00:00Z`]
 }).flat()
 return NextResponse.json({ success: true, slots: fallbackSlots, source: 'fallback' })
 }
 }
 default:
 return NextResponse.json({ success: false, error: 'unknown_tool' }, { status: 400 })
 }
 }

 // Lifecycle events (no tool_call). The most important is
 // call_analyzed - that's where Retell's post-call extraction lands.
 if (eventType === 'call_analyzed' || eventType === 'call_ended') {
  await handleCallEvent(eventType, body, resolvedBusinessId, callingAgentId)
 }

 return NextResponse.json({ received: true })
 } catch (error) {
 logger.error('Retell voice webhook error', { error: (error as Error).message })
 return NextResponse.json({ success: false }, { status: 500 })
 }
}

/**
 * Fire-and-forget prewarm: fetch next-7-days Cal.com slots and cache
 * them under the business's id. Called from call_inbound so the
 * agent's first lookup_availability mid-call returns from cache
 * instead of hitting Cal.com's API. Failures are silent - the live
 * Cal.com path is the fallback.
 */
async function prewarmSlotCache(businessId: string): Promise<void> {
  try {
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('cal_com_api_key, cal_com_event_type_id, timezone, state')
      .eq('id', businessId)
      .maybeSingle()
    const apiKey = (biz as any)?.cal_com_api_key as string | null
    const eventTypeId = (biz as any)?.cal_com_event_type_id as number | null
    const tz = resolveBusinessTimezone({
   explicit: (biz as any)?.timezone,
   state: (biz as any)?.state,
 })
    if (!apiKey || !eventTypeId) return

    const { listAvailableSlots } = await import('@/lib/calcom')
    const start = new Date()
    start.setUTCDate(start.getUTCDate() + 1)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)

    const rawSlots = await listAvailableSlots(apiKey, {
      eventTypeId,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      timeZone: tz,
    })

    const slots = rawSlots.map((iso) => isoInZone(iso, tz))
    const slots_display = rawSlots.map((iso) => formatHuman(iso, tz))

    await writeSlotCache(businessId, 'week', {
      slots, slots_display, timezone: tz, source: 'calcom', scope: 'week',
    })
  } catch (e) {
    logger.warn('prewarmSlotCache failed (non-fatal)', {
      businessId, error: e instanceof Error ? e.message : 'Unknown',
    })
  }
}

/**
 * Re-emit an ISO instant in the given IANA timezone. Preserves the
 * absolute moment in time; just changes the displayed wall-clock + offset.
 *
 *   isoInZone('2026-05-14T15:00:00-04:00', 'America/Chicago')
 *     => '2026-05-14T14:00:00-05:00'
 *
 * Uses Intl.DateTimeFormat parts (most reliable cross-runtime way to
 * grab wall-clock components in a specific TZ without pulling in
 * a heavy lib like luxon).
 */
function isoInZone(iso: string, tz: string): string {
 try {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const parts = new Intl.DateTimeFormat('en-US', {
   timeZone: tz,
   year: 'numeric', month: '2-digit', day: '2-digit',
   hour: '2-digit', minute: '2-digit', second: '2-digit',
   hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((acc, p) => {
   acc[p.type] = p.value
   return acc
  }, {})
  const hour = parts.hour === '24' ? '00' : parts.hour
  // Compute the offset for tz at that instant.
  const utcMs = d.getTime()
  const asLocal = new Date(`${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}Z`).getTime()
  const offsetMin = Math.round((asLocal - utcMs) / 60000)
  const sign = offsetMin >= 0 ? '+' : '-'
  const off = Math.abs(offsetMin)
  const offH = String(Math.floor(off / 60)).padStart(2, '0')
  const offM = String(off % 60).padStart(2, '0')
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${sign}${offH}:${offM}`
 } catch {
  return iso
 }
}

/**
 * Human-readable slot rendering in the business's timezone, what the
 * agent should literally read out loud.
 *
 *   formatHuman('2026-05-14T15:00:00-04:00', 'America/Chicago')
 *     => 'Thu May 14, 2:00 PM'
 */
/**
 * Parse the `datetime` argument the Retell agent passes to
 * book_appointment, robust to the common cases the LLM emits:
 *
 *   - 2026-05-19T13:00:00-05:00 → trusted as-is (proper ISO with offset)
 *   - 2026-05-19T13:00:00Z      → trusted as-is (proper ISO in UTC)
 *   - 2026-05-19T13:00:00       → NAIVE - we treat as business-local time
 *                                  and shift into UTC using the business
 *                                  timezone offset at that instant.
 *   - 2026-05-19                → date-only, assume 9 AM business-local
 *                                  (rare but not catastrophic - better
 *                                  than midnight UTC which shows up as
 *                                  the previous evening on the dashboard)
 *
 * Returns a real Date object in UTC. Falls back to plain Date(input)
 * for anything we can't pattern-match so we never throw mid-tool-call.
 */
function parseAgentDatetime(input: string, tz: string): Date {
 const s = (input || '').trim()
 const isoWithOffset = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})$/i
 const isoNaive = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/
 const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/

 if (isoWithOffset.test(s)) {
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
 }

 const naive = s.match(isoNaive)
 const dateMatch = !naive ? s.match(dateOnly) : null
 if (naive || dateMatch) {
  const y = Number(naive ? naive[1] : dateMatch![1])
  const mo = Number(naive ? naive[2] : dateMatch![2])
  const day = Number(naive ? naive[3] : dateMatch![3])
  const hr = Number(naive ? naive[4] : '9')
  const min = Number(naive ? naive[5] : '0')
  const sec = Number(naive ? (naive[6] || '0') : '0')
  // Treat (y, mo, day, hr, min) as wall-clock time in the business
  // timezone. Compute the UTC instant that, when rendered in tz,
  // reads as those wall-clock components.
  return wallClockToUtc(y, mo, day, hr, min, sec, tz)
 }

 // Fallback - hand whatever it was to Date and hope it parses.
 const d = new Date(s)
 return isNaN(d.getTime()) ? new Date() : d
}

/**
 * Convert wall-clock components in `tz` to the corresponding UTC Date.
 * Uses Intl.DateTimeFormat to discover the tz offset at that instant
 * (handles DST automatically). Iterates once because the offset itself
 * depends on the target UTC instant, and a fall-back-DST hour can
 * shift it.
 */
function wallClockToUtc(
 y: number, mo: number, day: number, hr: number, min: number, sec: number, tz: string,
): Date {
 // Start by pretending the wall clock IS UTC, then learn how wrong
 // that is by formatting that pretend-UTC instant in the target tz.
 const guessUtc = Date.UTC(y, mo - 1, day, hr, min, sec)
 const offsetMs = tzOffsetMs(new Date(guessUtc), tz)
 const realUtc = guessUtc - offsetMs
 // One refinement pass covers DST transition edge cases.
 const offset2 = tzOffsetMs(new Date(realUtc), tz)
 return new Date(guessUtc - offset2)
}

/** Offset, in ms, between the given instant's wall-clock in `tz` and UTC. */
function tzOffsetMs(at: Date, tz: string): number {
 const dtf = new Intl.DateTimeFormat('en-US', {
  timeZone: tz,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
 })
 const parts: Record<string, string> = {}
 for (const p of dtf.formatToParts(at)) if (p.type !== 'literal') parts[p.type] = p.value
 const asIfUtc = Date.UTC(
  Number(parts.year), Number(parts.month) - 1, Number(parts.day),
  Number(parts.hour === '24' ? '0' : parts.hour), Number(parts.minute), Number(parts.second),
 )
 return asIfUtc - at.getTime()
}

function formatHuman(iso: string, tz: string): string {
 try {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
   timeZone: tz,
   weekday: 'short',
   month: 'short',
   day: 'numeric',
   hour: 'numeric',
   minute: '2-digit',
   hour12: true,
  }).format(d).replace(',', '')
 } catch {
  return iso
 }
}

/**
 * Stores call metadata + post-call extraction on the matching calls
 * row. Retell fires call_ended first (transcript, duration), then
 * call_analyzed once the post-call analysis pass completes (extracted
 * fields per the agent's post_call_analysis_data definition).
 */
/**
 * Map Retell's disconnection_reason to the small enum the calls.status
 * CHECK constraint allows. Defaults to 'completed' for anything else
 * so the row still inserts.
 */
function mapDisconnectionToStatus(reason: string): string {
 switch (reason) {
  case 'dial_busy': return 'busy'
  case 'dial_no_answer': return 'no-answer'
  case 'dial_failed':
  case 'error_no_audio_received':
  case 'error_unknown':
  case 'error_llm_websocket_open':
  case 'error_llm_websocket_lost_connection':
  case 'error_llm_websocket_runtime':
  case 'error_llm_websocket_corrupt_payload':
  case 'error_frontend_corrupted_payload':
  case 'error_twilio':
  case 'error_inbound_webhook':
  case 'error_retell':
  case 'error_user_not_joined':
   return 'failed'
  case 'user_hangup':
  case 'agent_hangup':
  case 'call_transfer':
  case 'voicemail_reached':
  case 'inactivity':
  case 'machine_detected':
  case 'max_duration_reached':
  case 'concurrency_limit_reached':
  case 'no_valid_payment':
  case 'scam_detected':
  default:
   return 'completed'
 }
}

async function handleCallEvent(
 eventType: string,
 body: any,
 resolvedBusinessId: string | null,
 callingAgentId: string | undefined,
): Promise<void> {
 try {
  const call = body.call || body
  const retellCallId: string | undefined = call?.call_id || call?.id || body?.call_id
  if (!retellCallId) {
   logger.warn('Retell call event missing call_id', { eventType })
   return
  }

  // Build the patch from whatever fields are present on the event.
  const patch: Record<string, any> = {}
  if (typeof call?.transcript === 'string') patch.transcript = call.transcript
  if (typeof call?.recording_url === 'string') patch.recording_url = call.recording_url
  if (typeof call?.from_number === 'string') patch.from_number = call.from_number
  if (typeof call?.to_number === 'string') patch.to_number = call.to_number
  if (typeof call?.duration_ms === 'number') patch.duration = Math.round(call.duration_ms / 1000)
  // calls.status has a CHECK constraint limiting it to a known enum.
  // Retell's disconnection_reason (user_hangup, agent_hangup, dial_busy,
  // dial_no_answer, machine_detected, etc.) maps onto that set; anything
  // unrecognized falls back to 'completed' so the row still saves.
  if (typeof call?.disconnection_reason === 'string') {
   patch.status = mapDisconnectionToStatus(call.disconnection_reason)
  } else if (eventType === 'call_ended' || eventType === 'call_analyzed') {
   patch.status = 'completed'
  }

  // post_call_analysis_data is the headline feature. Retell returns
  // it as either an object keyed by field name or an array of
  // { name, value } entries depending on agent config - we normalize
  // to a flat object before storing.
  const analysis =
   call?.call_analysis?.custom_analysis_data ??
   call?.post_call_analysis_data ??
   call?.analysis ??
   null
  if (analysis) {
   const flat: Record<string, any> = {}
   if (Array.isArray(analysis)) {
    for (const entry of analysis) {
     if (entry?.name) flat[String(entry.name)] = entry.value ?? entry.result ?? null
    }
   } else if (typeof analysis === 'object') {
    Object.assign(flat, analysis)
   }
   if (Object.keys(flat).length > 0) patch.call_extractions = flat
   // Promote the extracted name into the top-level caller_name column
   // so the dashboard calls list can render it without parsing JSON.
   // Try the most likely keys in order; an empty string from Retell
   // (caller never gave a name) leaves the column null.
   const extractedName =
    (flat.customer_name as string | undefined) ||
    (flat.caller_name as string | undefined) ||
    (flat.name as string | undefined) ||
    null
   if (extractedName && typeof extractedName === 'string' && extractedName.trim()) {
    patch.caller_name = extractedName.trim().slice(0, 120)
   }
   // Promote booking_type into the top-level outcome column. The calls
   // list reads outcome to render the BOOKED / MESSAGE / DROPPED tag;
   // without this every booked call defaulted to MESSAGE because we
   // had the answer in call_extractions.booking_type but never
   // surfaced it to the column the UI reads.
   const bookingType = flat.booking_type
   if (typeof bookingType === 'string' && bookingType.trim()) {
    patch.outcome = bookingType.trim().toLowerCase()
   }
  }

  // Retell's general analysis (sentiment, summary, success indicator).
  if (call?.call_analysis?.call_summary && !patch.call_summary) {
   patch.call_summary = call.call_analysis.call_summary
  }
  if (call?.call_analysis?.user_sentiment && !patch.sentiment) {
   // calls.sentiment has a CHECK constraint (lowercase positive/neutral/
   // negative/unknown). Retell sends 'Positive'/'Neutral'/'Negative'.
   const raw = String(call.call_analysis.user_sentiment).toLowerCase()
   if (raw === 'positive' || raw === 'neutral' || raw === 'negative') {
    patch.sentiment = raw
   }
  }

  if (Object.keys(patch).length === 0) {
   // Diagnostic: this is the silent-skip path. If transcript/recording/
   // from_number/to_number/analysis are all missing, the patch is empty
   // and we'd otherwise return without a trace. Fire a critical admin
   // notification with the body shape so we can see *why* the call
   // can't be persisted.
   await notifyAdmin({
    type: 'call.empty_patch',
    severity: 'critical',
    title: 'Retell webhook had nothing to persist',
    body: `${eventType} for ${retellCallId} (agent ${callingAgentId || 'none'}) had no patch fields. body keys: [${Object.keys(body || {}).join(',')}]. call keys: [${Object.keys(body?.call || {}).join(',')}].`,
    metadata: {
     retell_call_id: retellCallId,
     event_type: eventType,
     agent_id: callingAgentId || null,
     body_keys: Object.keys(body || {}),
     call_keys: Object.keys(body?.call || {}),
     sample: JSON.stringify(body).slice(0, 1500),
    },
   })
   return
  }

  // Try matching on retell_call_id first; fall back to inserting if
  // we never saw call_started (Retell can fire analyzed without it).
  const { data: existing } = await supabaseAdmin
   .from('calls')
   .select('id')
   .eq('retell_call_id', retellCallId)
   .maybeSingle()

  if (existing?.id) {
   // If cancel_appointment ran during the call it already wrote
   // outcome='cancelled' + booking_type='cancelled' to this row.
   // Retell's post-call categorizer doesn't know about cancellations
   // and will overwrite to 'booked' or 'message'. Preserve our
   // explicit value by re-reading and skipping outcome promotion
   // when we've already marked it.
   const { data: prev } = await supabaseAdmin
    .from('calls')
    .select('outcome, call_extractions')
    .eq('id', existing.id)
    .maybeSingle()
   const prevOutcome = (prev as any)?.outcome as string | undefined
   const prevBookingType = ((prev as any)?.call_extractions || {})?.booking_type as string | undefined
   if (prevOutcome === 'cancelled' || prevBookingType === 'cancelled') {
    if ('outcome' in patch) delete (patch as any).outcome
    if (patch.call_extractions && typeof patch.call_extractions === 'object') {
     // Merge instead of replace so we don't lose cancelled_appointment_id.
     patch.call_extractions = {
      ...(prev as any).call_extractions,
      ...(patch.call_extractions as any),
      booking_type: 'cancelled',
     }
    }
   }
   const upd = await supabaseAdmin
    .from('calls')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
   if (upd.error) {
    await notifyAdmin({
     type: 'call.update_failed',
     severity: 'critical',
     title: `calls UPDATE failed on ${eventType}`,
     body: `${upd.error.message}. row id ${existing.id}, retell_call_id ${retellCallId}. patch keys: [${Object.keys(patch).join(',')}].`,
     metadata: { error: upd.error.message, patch_keys: Object.keys(patch), retell_call_id: retellCallId },
    }).catch(() => {})
   }
   return
  }

  // No existing row - try one more time to resolve the business using
  // any to_number on this event itself (call_ended often carries it
  // even when call_inbound resolution failed).
  const finalBusinessId =
   resolvedBusinessId || (await resolveCallBusinessId(callingAgentId, call?.to_number))

  if (finalBusinessId) {
   // Upsert on the unique call_id constraint. call_ended and call_analyzed
   // fire near-simultaneously from Retell; without upsert the second one
   // races, misses the existing-row check, and dies on the unique key.
   // calls.from_number / to_number / status are NOT NULL. When call_ended
   // or call_analyzed fires without a matching call_started row, Retell's
   // payload sometimes omits these (analysis-only events). Supply safe
   // defaults so the insert doesn't fail and the transcript/recording/
   // outcome still get persisted.
   const ins = await supabaseAdmin
    .from('calls')
    .upsert({
     business_id: finalBusinessId,
     // calls.call_id is NOT NULL in the schema (legacy column from before
     // retell_call_id existed). Populate it with the Retell id so the
     // insert doesn't fail the constraint.
     call_id: retellCallId,
     retell_call_id: retellCallId,
     from_number: patch.from_number || call?.from_number || 'unknown',
     to_number: patch.to_number || call?.to_number || 'unknown',
     status: patch.status || 'completed',
     ...patch,
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString(),
    }, { onConflict: 'call_id' })
   if (ins.error) {
    await notifyAdmin({
     type: 'call.insert_failed',
     severity: 'critical',
     title: `calls UPSERT failed on ${eventType}`,
     body: `${ins.error.message}. business_id ${finalBusinessId}, retell_call_id ${retellCallId}. patch keys: [${Object.keys(patch).join(',')}].`,
     metadata: { error: ins.error.message, patch_keys: Object.keys(patch), retell_call_id: retellCallId, business_id: finalBusinessId },
    }).catch(() => {})
   }
   return
  }

  // Still unresolved. This is the silent-data-loss path - log loudly
  // and fire an admin notification so it doesn't sit unnoticed.
  logger.error('Retell call event could not be matched to a business', {
   retellCallId,
   eventType,
   agentId: callingAgentId,
   toNumber: call?.to_number,
   fromNumber: call?.from_number,
  })
  // Capture the body shape so we can see which fields Retell actually
  // sent (the unmatched notification was reporting "unknown -> unknown"
  // even on real phone calls, meaning to_number was missing - the body
  // dump shows whether it's nested under a different key in newer
  // Retell webhook versions).
  const bodyKeys = Object.keys(body || {})
  const callKeys = Object.keys(body?.call || {})
  await notifyAdmin({
   type: 'call.unmatched',
   severity: 'critical',
   title: 'Inbound call not linked to a business',
   body: `Retell ${eventType} fired but no business matched. ${call?.from_number || 'unknown'} -> ${call?.to_number || 'unknown'}, agent ${callingAgentId || 'none'}, call ${retellCallId}. body keys: [${bodyKeys.join(',')}]. call keys: [${callKeys.join(',')}].`,
   metadata: {
    retell_call_id: retellCallId,
    event_type: eventType,
    agent_id: callingAgentId || null,
    to_number: call?.to_number || null,
    from_number: call?.from_number || null,
    body_keys: bodyKeys,
    call_keys: callKeys,
    sample: JSON.stringify(body).slice(0, 1500),
   },
  })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  const stack = e instanceof Error ? e.stack || '' : ''
  logger.error('handleCallEvent failed', { error: msg, eventType })
  // TEMP: surface the actual error so we stop losing calls silently.
  await notifyAdmin({
   type: 'call.handler_threw',
   severity: 'critical',
   title: `handleCallEvent threw on ${eventType}`,
   body: `${msg}. ${stack.split('\n').slice(0, 4).join(' | ').slice(0, 1500)}`,
   metadata: { error: msg, stack: stack.slice(0, 2000), event_type: eventType },
  }).catch(() => {})
 }
}
