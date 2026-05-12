import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { scheduleReviewRequest } from '@/lib/review-requests'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cal.com webhook receiver.
 *
 * One endpoint per business: /api/webhooks/cal/<businessId>. Cal.com signs
 * the body with the secret we set when registering the webhook
 * (cal_com_webhook_secret on businesses); we verify HMAC-SHA256 in the
 * X-Cal-Signature-256 header before accepting.
 *
 * Mirrors BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED into
 * appointments so the dashboard reflects bookings made directly in Cal.com.
 */
export async function POST(
 request: NextRequest,
 { params }: { params: { businessId: string } },
) {
 try {
  const businessId = params.businessId
  const rawBody = await request.text()

  // Look up business + secret
  const { data: business, error } = await supabaseAdmin
   .from('businesses')
   .select('id, cal_com_webhook_secret, services, timezone')
   .eq('id', businessId)
   .single()

  if (error || !business) {
   return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Verify signature (Cal.com sends HMAC-SHA256 hex of the raw body).
  // Refuse the request entirely when no secret is on file - without
  // that we'd be accepting unsigned payloads from anyone who can guess
  // a businessId. The only legitimate path is: admin runs Cal.com
  // connect or rewire, which always stores a secret.
  const signature = request.headers.get('x-cal-signature-256') || ''
  const secret = business.cal_com_webhook_secret
  if (!secret) {
   logger.warn('Cal.com webhook rejected - no signing secret on business', { businessId })
   return NextResponse.json(
    { error: 'No signing secret configured for this tenant. Re-run Cal.com connect.' },
    { status: 401 },
   )
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  if (!timingSafeEqual(expected, signature)) {
   logger.warn('Cal.com webhook signature mismatch', { businessId })
   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try { event = JSON.parse(rawBody) } catch {
   return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const trigger = event?.triggerEvent || event?.type
  const payload = event?.payload || event?.data || event

  switch (trigger) {
   case 'BOOKING_CREATED':
   case 'BOOKING_REQUESTED':
    await upsertFromBooking(businessId, payload, 'scheduled')
    break
   case 'BOOKING_RESCHEDULED':
    await upsertFromBooking(businessId, payload, 'scheduled')
    break
   case 'BOOKING_CANCELLED':
   case 'BOOKING_REJECTED':
    await markCancelled(businessId, payload)
    break
   case 'MEETING_ENDED':
    await markCompleted(businessId, payload)
    break
   case 'BOOKING_NO_SHOW_UPDATED':
    await markNoShow(businessId, payload)
    break
   default:
    logger.info('Cal.com webhook: unhandled trigger', { trigger, businessId })
  }

  return NextResponse.json({ ok: true })
 } catch (e) {
  logger.error('Cal.com webhook error', {
   error: e instanceof Error ? e.message : 'Unknown',
  })
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
 }
}

function timingSafeEqual(a: string, b: string) {
 const bufA = Buffer.from(a)
 const bufB = Buffer.from(b)
 if (bufA.length !== bufB.length) return false
 return crypto.timingSafeEqual(bufA, bufB)
}

async function upsertFromBooking(
 businessId: string,
 payload: any,
 status: 'scheduled' | 'confirmed',
) {
 const uid: string | undefined = payload?.uid
 if (!uid) return

 // If we created this booking ourselves (metadata stamp), skip - DB row already exists.
 const cgId = payload?.metadata?.cloudgreetAppointmentId
 if (cgId) return

 const startIso = payload?.startTime || payload?.start
 const endIso = payload?.endTime || payload?.end
 if (!startIso || !endIso) return

 const start = new Date(startIso)
 const end = new Date(endIso)
 const duration = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000))

 const attendee = (payload?.attendees && payload.attendees[0]) || {}
 const customer_name = attendee.name || payload?.responses?.name || 'Booked via Cal.com'
 const customer_email = attendee.email || null
 const customer_phone =
  payload?.responses?.phone ||
  payload?.responses?.smsReminderNumber ||
  attendee.phoneNumber ||
  ''

 const service_type = payload?.eventType?.title || payload?.eventTitle || 'Appointment'

 // Upsert by cal_com_booking_uid
 const { data: existing } = await supabaseAdmin
  .from('appointments')
  .select('id')
  .eq('business_id', businessId)
  .eq('cal_com_booking_uid', uid)
  .maybeSingle()

 if (existing) {
  await supabaseAdmin
   .from('appointments')
   .update({
    scheduled_date: startIso.slice(0, 10),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration,
    status,
    updated_at: new Date().toISOString(),
   })
   .eq('id', existing.id)
  return
 }

 const { data: inserted } = await supabaseAdmin
  .from('appointments')
  .insert({
   business_id: businessId,
   customer_name,
   customer_email,
   customer_phone,
   service_type,
   scheduled_date: startIso.slice(0, 10),
   start_time: start.toISOString(),
   end_time: end.toISOString(),
   duration,
   status,
   cal_com_booking_uid: uid,
   cal_com_booking_id: payload?.id || null,
   notes: payload?.responses?.notes || null,
  })
  .select('id')
  .single()

 // Schedule a follow-up review SMS. The customer booked directly on
 // the contractor's Cal.com page; the contractor's global review
 // toggle is their opt-in. scheduleReviewRequest no-ops when the
 // feature is off, the phone is missing or opted out, or we already
 // sent within 90 days.
 if (inserted?.id && customer_phone) {
  try {
   await scheduleReviewRequest({
    appointmentId: inserted.id,
    businessId,
    customerPhone: customer_phone,
    customerName: customer_name,
    appointmentStart: start,
    reviewConsent: true,
   })
  } catch (e) {
   logger.warn('scheduleReviewRequest (cal webhook) threw', {
    appointmentId: inserted.id,
    error: e instanceof Error ? e.message : 'Unknown',
   })
  }
 }
}

async function markCancelled(businessId: string, payload: any) {
 const uid: string | undefined = payload?.uid
 if (!uid) return
 await supabaseAdmin
  .from('appointments')
  .update({ status: 'cancelled', updated_at: new Date().toISOString() })
  .eq('business_id', businessId)
  .eq('cal_com_booking_uid', uid)
}

async function markCompleted(businessId: string, payload: any) {
 const uid: string | undefined = payload?.uid
 if (!uid) return
 await supabaseAdmin
  .from('appointments')
  .update({ status: 'completed', updated_at: new Date().toISOString() })
  .eq('business_id', businessId)
  .eq('cal_com_booking_uid', uid)
}

async function markNoShow(businessId: string, payload: any) {
 const uid: string | undefined = payload?.uid
 if (!uid) return
 await supabaseAdmin
  .from('appointments')
  .update({ status: 'no_show', updated_at: new Date().toISOString() })
  .eq('business_id', businessId)
  .eq('cal_com_booking_uid', uid)
}
