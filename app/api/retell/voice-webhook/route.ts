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

 const eventType: string = body.event || body.type || 'unknown'
 
 // Allow ping events without signature verification (Retell health checks)
 if (eventType === 'ping') {
 return NextResponse.json({ ok: true })
 }

 // Verify webhook signature (Retell) for all other events
 const signature = request.headers.get('x-retell-signature')
 
 // Skip verification in development, require in production
 if (process.env.NODE_ENV === 'production') {
 const isValid = verifyRetellSignature(rawBody, signature)
 if (!isValid) {
 logger.warn('Retell webhook signature verification failed', {
 hasSignature: !!signature,
 eventType
 })
 return NextResponse.json(
 { success: false, error: 'Invalid webhook signature' },
 { status: 401 }
 )
 }
 }

 // Now process the verified body
 const tool: RetellToolCall | null = body.tool_call || null
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
 switch (tool.name) {
 case 'book_appointment': {
 const { name, phone, service, datetime, business_id: toolBusinessId, review_consent: reviewConsentRaw } = tool.arguments || {}
 // Coerce review_consent to a strict boolean - the agent may pass true/false,
 // "true"/"false", "yes"/"no", or omit entirely. Anything ambiguous = false
 // so we never text without an explicit yes.
 const reviewConsent =
   reviewConsentRaw === true ||
   reviewConsentRaw === 'true' ||
   reviewConsentRaw === 'yes' ||
   reviewConsentRaw === 'y'

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
 .select('id, stripe_customer_id, subscription_status, timezone, cal_com_api_key, cal_com_event_type_id, business_name, email, phone_number')
 .eq('id', business_id)
 .single()

 if (businessError || !business) {
 logger.error('Business not found', { business_id, error: businessError?.message || JSON.stringify(businessError) })
 return NextResponse.json({ success: false, error: 'business_not_found' }, { status: 404 })
 }

 // Parse datetime and calculate end time (default 1 hour duration)
 const startTime = new Date(datetime)
 const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // Add 1 hour

 // Create appointment in database using transaction function for atomicity
 const { data: appointmentId, error: appointmentError } = await supabaseAdmin.rpc('create_appointment_safe', {
 p_business_id: business_id,
 p_customer_name: name,
 p_customer_phone: phone,
 p_customer_email: null, // Email not available from voice call
 p_service_type: service,
 p_scheduled_date: datetime,
 p_start_time: startTime.toISOString(),
 p_end_time: endTime.toISOString(),
 p_duration: 60,
 p_notes: null,
 p_estimated_value: null
 })

 if (appointmentError || !appointmentId) {
 logger.error('book_appointment transaction failed', { 
 error: appointmentError?.message || 'No appointment ID returned',
 business_id,
 customer_name: name
 })
 return NextResponse.json({ success: false, error: 'db_error' }, { status: 500 })
 }

 const apptId = appointmentId

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

 // Cal.com booking - this is the path that lands on the contractor's
 // calendar (Google/Apple/Outlook via Cal.com). Without this, the
 // appointment exists in our DB but never appears on their actual
 // calendar feed.
 if ((business as any)?.cal_com_api_key && (business as any)?.cal_com_event_type_id) {
 try {
  const { createBooking } = await import('@/lib/calcom')
  const booking = await createBooking((business as any).cal_com_api_key, {
   startIso: startTime.toISOString(),
   eventTypeId: Number((business as any).cal_com_event_type_id),
   attendee: {
    name: name || 'Caller',
    email: `noemail+${apptId}@cloudgreet.com`,
    timeZone: (business as any).timezone || 'America/Chicago',
    phoneNumber: phone || undefined,
   },
   metadata: {
    cloudgreet_business_id: String(business_id),
    cloudgreet_appointment_id: String(apptId),
    customer_phone: phone || '',
   },
   notes: `Booked by CloudGreet AI receptionist. Service requested: ${service || 'unspecified'}. Caller phone: ${phone || 'unknown'}.`,
  })
  // Persist Cal.com booking ids on the appointment so cancel/reschedule
  // flows can find it later.
  await supabaseAdmin
   .from('appointments')
   .update({
    cal_com_booking_uid: booking.uid,
    cal_com_booking_id: booking.id,
    updated_at: new Date().toISOString(),
   })
   .eq('id', apptId)
  logger.info('Cal.com booking created', {
   business_id, apptId, calBookingUid: booking.uid,
  })
 } catch (calErr) {
  logger.error('Cal.com booking failed (DB appointment kept)', {
   business_id, apptId,
   error: calErr instanceof Error ? calErr.message : 'Unknown',
  })
 }
 } else {
 logger.warn('Skipping Cal.com booking - no cal.com config on business', { business_id })
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

 // Booking notification SMS - sent to the CONTRACTOR (account
 // holder), not the caller. Single CloudGreet sender number, so
 // this is account-notification traffic and doesn't require per-
 // contractor messaging-profile attachments. Template editable in
 // /dashboard/settings; falls back to DEFAULT_BOOKING_SMS_TEMPLATE.
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
 })
 } catch (e) {
 logger.warn('booking notification failed', {
 error: e instanceof Error ? e.message : 'Unknown',
 business_id,
 has_messaging_profile: !!process.env.TELNYX_MESSAGING_PROFILE_ID,
 })
 }

 return NextResponse.json({ success: true, appointment_id: apptId })
 }
 case 'send_booking_sms': {
 const { phone, appt_id } = tool.arguments || {}
 if (!phone || !appt_id) {
 return NextResponse.json({ success: false, error: 'missing_parameters' }, { status: 400 })
 }
 // Look up the business's outbound number so the SMS appears to
 // come from the same line the caller dialed.
 const { data: bizRow } = await supabaseAdmin
 .from('businesses')
 .select('phone_number, business_name')
 .eq('id', resolvedBusinessId)
 .maybeSingle()
 const fromNum = (bizRow as any)?.phone_number
 if (!fromNum) {
 logger.warn('send_booking_sms skipped - no phone_number on business', { business_id: resolvedBusinessId })
 return NextResponse.json({ success: false, error: 'no_business_phone' }, { status: 400 })
 }
 try {
 await telnyxClient.sendSMS(
 phone,
 `${(bizRow as any)?.business_name || 'Booking'}: confirmation for appointment ${appt_id}. Reply STOP to opt out; HELP for help.`,
 fromNum,
 )
 return NextResponse.json({ success: true })
 } catch (smsError) {
 logger.error('send_booking_sms failed', {
 error: smsError instanceof Error ? smsError.message : 'Unknown error',
 phone,
 appt_id
 })
 return NextResponse.json({ success: false, error: 'sms_send_failed' }, { status: 500 })
 }
 }
 case 'lookup_availability': {
 const { date, duration = 60 } = tool.arguments || {}

 // Same trust model as book_appointment: ignore any business_id from
 // the tool arguments and resolve from the calling agent.
 if (!resolvedBusinessId) {
 return NextResponse.json({ success: false, error: 'agent_not_linked_to_business' }, { status: 403 })
 }
 const business_id = resolvedBusinessId

 // Preferred path: ask Cal.com directly. That accounts for manual
 // Cal.com bookings, Google/Apple/Outlook sync, and the contractor's
 // working hours - our local appointments table can't see any of
 // those, so falling back to it risks double-booking.
 try {
 const { data: biz } = await supabaseAdmin
 .from('businesses')
 .select('cal_com_api_key, cal_com_event_type_id, timezone')
 .eq('id', business_id)
 .maybeSingle()

 const apiKey = (biz as any)?.cal_com_api_key as string | null
 const eventTypeId = (biz as any)?.cal_com_event_type_id as number | null
 const tz = ((biz as any)?.timezone as string | null) || 'America/Chicago'

 if (apiKey && eventTypeId) {
 const { listAvailableSlots } = await import('@/lib/calcom')

 // Window: either the one day the agent asked about, or the
 // next 7 days starting tomorrow.
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

 const slots = await listAvailableSlots(apiKey, {
 eventTypeId,
 startIso,
 endIso,
 timeZone: tz,
 })

 return NextResponse.json({ success: true, slots, source: 'calcom' })
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
 return NextResponse.json({ success: true, slots: fullSlots, source: 'local' })
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

 return NextResponse.json({ success: true, slots: allSlots, source: 'local' })
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
 * Stores call metadata + post-call extraction on the matching calls
 * row. Retell fires call_ended first (transcript, duration), then
 * call_analyzed once the post-call analysis pass completes (extracted
 * fields per the agent's post_call_analysis_data definition).
 */
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
  if (typeof call?.disconnection_reason === 'string') patch.status = call.disconnection_reason

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
  }

  // Retell's general analysis (sentiment, summary, success indicator).
  if (call?.call_analysis?.call_summary && !patch.call_summary) {
   patch.call_summary = call.call_analysis.call_summary
  }
  if (call?.call_analysis?.user_sentiment && !patch.sentiment) {
   patch.sentiment = call.call_analysis.user_sentiment
  }

  if (Object.keys(patch).length === 0) return

  // Try matching on retell_call_id first; fall back to inserting if
  // we never saw call_started (Retell can fire analyzed without it).
  const { data: existing } = await supabaseAdmin
   .from('calls')
   .select('id')
   .eq('retell_call_id', retellCallId)
   .maybeSingle()

  if (existing?.id) {
   await supabaseAdmin
    .from('calls')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
   return
  }

  // No existing row - try one more time to resolve the business using
  // any to_number on this event itself (call_ended often carries it
  // even when call_inbound resolution failed).
  const finalBusinessId =
   resolvedBusinessId || (await resolveCallBusinessId(callingAgentId, call?.to_number))

  if (finalBusinessId) {
   await supabaseAdmin
    .from('calls')
    .insert({
     business_id: finalBusinessId,
     retell_call_id: retellCallId,
     ...patch,
     created_at: new Date().toISOString(),
    })
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
  await notifyAdmin({
   type: 'call.unmatched',
   severity: 'critical',
   title: 'Inbound call not linked to a business',
   body: `Retell ${eventType} fired but no business matched. ${call?.from_number || 'unknown'} -> ${call?.to_number || 'unknown'}, agent ${callingAgentId || 'none'}, call ${retellCallId}.`,
   metadata: {
    retell_call_id: retellCallId,
    event_type: eventType,
    agent_id: callingAgentId || null,
    to_number: call?.to_number || null,
    from_number: call?.from_number || null,
   },
  })
 } catch (e) {
  logger.error('handleCallEvent failed', {
   error: e instanceof Error ? e.message : 'Unknown', eventType,
  })
 }
}
