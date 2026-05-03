import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telnyxClient } from '@/lib/telnyx'
import { createCalendarEvent } from '@/lib/calendar'
import { verifyRetellSignature } from '@/lib/webhook-verification'
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
 // webhook envelope is the trustworthy identifier — Retell signs the
 // body and the agent → business mapping is in our DB.
 const callingAgentId: string | undefined =
  body.call?.agent_id || body.agent_id || body.metadata?.agent_id
 let resolvedBusinessId: string | null = null
 if (callingAgentId) {
  const { data: agentRow } = await supabaseAdmin
   .from('ai_agents')
   .select('business_id')
   .eq('retell_agent_id', callingAgentId)
   .maybeSingle()
  if (agentRow?.business_id) {
   resolvedBusinessId = agentRow.business_id
  } else {
   const { data: bizRow } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('retell_agent_id', callingAgentId)
    .maybeSingle()
   if (bizRow?.id) resolvedBusinessId = bizRow.id
  }
 }

 if (tool) {
 switch (tool.name) {
 case 'book_appointment': {
 const { name, phone, service, datetime, business_id: toolBusinessId } = tool.arguments || {}

 // Reject if we couldn't resolve a business from the agent. Falling
 // back to tool args would re-introduce the spoofing risk.
 if (!resolvedBusinessId) {
 logger.warn('Retell book_appointment with unresolvable agent', { callingAgentId })
 return NextResponse.json({ success: false, error: 'agent_not_linked_to_business' }, { status: 403 })
 }
 if (toolBusinessId && toolBusinessId !== resolvedBusinessId) {
 logger.warn('Retell tool args business_id mismatch — ignoring tool value', {
  toolBusinessId, resolvedBusinessId, callingAgentId,
 })
 }
 const business_id = resolvedBusinessId

 // Get business info to check subscription and get Stripe customer ID
 const { data: business, error: businessError } = await supabaseAdmin
 .from('businesses')
 .select('id, stripe_customer_id, subscription_status, timezone')
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

 // Sync to Google Calendar if calendar is connected (appointment already created above)
 if (business_id) {
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

 // Send SMS confirmation
 if (phone) {
 try {
 await telnyxClient.sendSMS(
 phone,
 `Your appointment is booked for ${new Date(datetime).toLocaleDateString()} at ${new Date(datetime).toLocaleTimeString()}. Service: ${service}. Reply STOP to opt out; HELP for help.`
 )
 } catch (e) {
 logger.warn('SMS confirmation failed', { error: (e as Error).message })
 }
 }

 return NextResponse.json({ success: true, appointment_id: apptId })
 }
 case 'send_booking_sms': {
 const { phone, appt_id } = tool.arguments || {}
 if (!phone || !appt_id) {
 return NextResponse.json({ success: false, error: 'missing_parameters' }, { status: 400 })
 }
 try {
 await telnyxClient.sendSMS(
 phone,
 `Confirmation for appointment ${appt_id}. Reply STOP to opt out; HELP for help.`
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

 try {
 // Use real calendar availability logic
 const { getAvailableSlots } = await import('@/lib/calendar')
 
 // If date provided, get slots for that date; otherwise get next 7 days
 if (date) {
 const slots = await getAvailableSlots(business_id, date, duration)
 const fullSlots = slots.map(slot => `${date}T${slot}:00`)
 return NextResponse.json({ success: true, slots: fullSlots })
 } else {
 // Get next 7 days of available slots
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
 
 return NextResponse.json({ success: true, slots: allSlots })
 }
 } catch (error) {
 logger.error('lookup_availability failed', { 
 error: error instanceof Error ? error.message : 'Unknown error',
 business_id 
 })
 // Fallback to simple slots if calendar lookup fails
 const now = new Date()
 const fallbackSlots = [1, 2, 3].map((d) => {
 const day = new Date(now)
 day.setDate(now.getDate() + d)
 const dayStr = day.toISOString().slice(0, 10)
 return [`${dayStr}T10:00:00Z`, `${dayStr}T14:00:00Z`]
 }).flat()
 return NextResponse.json({ success: true, slots: fallbackSlots })
 }
 }
 default:
 return NextResponse.json({ success: false, error: 'unknown_tool' }, { status: 400 })
 }
 }

 return NextResponse.json({ received: true })
 } catch (error) {
 logger.error('Retell voice webhook error', { error: (error as Error).message })
 return NextResponse.json({ success: false }, { status: 500 })
 }
}
