/**
 * Booking notification SMS - the "your phone buzzes the moment the AI
 * books a job" feature. ONE CloudGreet-owned number sends to the
 * CONTRACTOR (the platform's customer), not to end consumers - so this
 * is account-notification traffic, not consumer messaging. Carrier
 * filtering risk is minimal compared to the per-contractor messaging
 * profile model.
 *
 * Required env:
 *   CLOUDGREET_NOTIFICATIONS_FROM    - the single sender number,
 *                                       attached to your messaging
 *                                       profile in the Telnyx dashboard.
 *   TELNYX_API_KEY                    - already required app-wide.
 *   TELNYX_MESSAGING_PROFILE_ID       - recommended, ties traffic to
 *                                       your A2P 10DLC registration.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telnyxClient } from '@/lib/telnyx'
import { normalizePhoneForLookup } from '@/lib/phone-normalization'
import { notifyAdmin } from '@/lib/notifications/notify'

export const DEFAULT_BOOKING_SMS_TEMPLATE =
  '[CloudGreet] New booking: {name}, {time}. Service: {service}. Caller: {phone}'

/**
 * Hard default for emergency bookings. Visually distinct prefix so the
 * contractor's lockscreen makes it impossible to confuse with a routine
 * new-booking ping. Contractors can override this in dashboard
 * settings (businesses.booking_sms_template_emergency).
 */
export const DEFAULT_EMERGENCY_SMS_TEMPLATE =
  '🚨 URGENT — {name} at {address}. {service}. Phone: {phone}. Booked {time}. Reach out ASAP.'

export const TEMPLATE_MAX_LENGTH = 320

/**
 * Variables a contractor can use in their template. Listed in the UI
 * as fill-me hints. Order = how they appear in the help text.
 */
export const TEMPLATE_VARIABLES: { name: string; description: string; sample: string }[] = [
  { name: 'name',     description: "caller's name",         sample: 'John Smith' },
  { name: 'phone',    description: "caller's phone",        sample: '+1 (555) 123-4567' },
  { name: 'time',     description: 'appointment date/time', sample: 'Tue Jul 8, 2:00 PM' },
  { name: 'service',  description: 'what they booked',      sample: 'AC repair' },
  { name: 'address',  description: 'service address',       sample: '123 Main St' },
  { name: 'business', description: "the business's name",   sample: 'Mike\'s HVAC' },
]

export type BookingNotificationContext = {
  name?: string | null
  phone?: string | null
  time?: string | null      // pre-formatted display string
  service?: string | null
  address?: string | null
  business?: string | null
  /**
   * When true, sendBookingNotification picks the emergency template
   * (custom businesses.booking_sms_template_emergency, falling back to
   * DEFAULT_EMERGENCY_SMS_TEMPLATE) instead of the routine template.
   * Set by the agent via the book_appointment `is_emergency` arg.
   */
  is_emergency?: boolean
}

/**
 * Substitute {var} placeholders in a template. Missing values render
 * as empty strings rather than the literal "{var}" so the SMS is
 * still readable when, e.g., we never collected the address.
 */
export function renderTemplate(
  template: string,
  ctx: BookingNotificationContext,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = (ctx as any)[key]
    return typeof v === 'string' ? v.trim() : ''
  }).replace(/[ \t]+/g, ' ').replace(/[ \t]+([,.!?])/g, '$1').trim()
}

/**
 * Sample data for previews + admin tester. Same shape as a real
 * booking, just obviously fake values so reps don't confuse a test
 * with a real notification.
 */
export const SAMPLE_CONTEXT: BookingNotificationContext = {
  name: 'John Smith',
  phone: '+1 (555) 123-4567',
  time: 'Tue Jul 8, 2:00 PM',
  service: 'AC repair',
  address: '123 Main St',
  business: 'Sample HVAC Co',
}

/**
 * Send the booking notification for a business. Returns true on send,
 * false on any pre-flight skip (no notifications_phone set, sender
 * env missing, etc.). Throws on actual Telnyx failures so the caller
 * can decide whether to surface the error.
 */
export async function sendBookingNotification(
  businessId: string,
  ctx: BookingNotificationContext,
): Promise<{ sent: boolean; reason?: string }> {
  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!fromNumber) {
    // Misconfiguration in prod = every booking is invisible to the
    // contractor. Surface to admin instead of swallowing.
    logger.error('booking-notification skipped - CLOUDGREET_NOTIFICATIONS_FROM unset', { businessId })
    if (process.env.NODE_ENV === 'production') {
      try {
        await notifyAdmin({
          type: 'booking_notification.misconfigured',
          severity: 'critical',
          title: 'Booking SMS sender number not configured',
          body: `CLOUDGREET_NOTIFICATIONS_FROM env var is missing. Contractors are not receiving booking alerts. Set it in Vercel and redeploy.`,
          metadata: { business_id: businessId },
        })
      } catch { /* notification dropping shouldn't block */ }
    }
    return { sent: false, reason: 'CLOUDGREET_NOTIFICATIONS_FROM env var not set' }
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('notifications_phone, booking_sms_template, booking_sms_template_emergency, business_name')
    .eq('id', businessId)
    .maybeSingle()

  if (!biz) return { sent: false, reason: 'business not found' }

  const rawTo = (biz as any).notifications_phone
  if (!rawTo) {
    logger.warn('booking-notification skipped - business has no notifications_phone', { businessId })
    return { sent: false, reason: 'business has no notifications_phone set' }
  }
  const to = normalizePhoneForLookup(rawTo)
  if (!to) {
    logger.error('booking-notification skipped - notifications_phone failed E.164 normalization', { businessId, rawTo })
    return { sent: false, reason: 'notifications_phone is not a valid phone number' }
  }

  // STOP-keyword opt-outs apply even to "account notification" traffic.
  // If the contractor texted STOP from this number, Telnyx will reject
  // the send anyway - we check first so we can record the skip.
  const { data: optedOut } = await supabaseAdmin
    .from('review_opt_outs')
    .select('phone')
    .eq('phone', to)
    .maybeSingle()
  if (optedOut) {
    logger.warn('booking-notification skipped - recipient opted out', { businessId, to })
    return { sent: false, reason: 'recipient is opted out (STOP)' }
  }

  // Emergency bookings get a separate (and visually-distinct-by-default)
  // template. Contractors can customise it in dashboard settings; the
  // hardcoded fallback ensures the contractor sees an obvious URGENT
  // marker even before they touch the setting.
  const template = ctx.is_emergency
    ? ((biz as any).booking_sms_template_emergency || DEFAULT_EMERGENCY_SMS_TEMPLATE)
    : ((biz as any).booking_sms_template || DEFAULT_BOOKING_SMS_TEMPLATE)
  const finalCtx: BookingNotificationContext = {
    ...ctx,
    business: ctx.business || (biz as any).business_name || null,
  }
  const message = renderTemplate(template, finalCtx).slice(0, TEMPLATE_MAX_LENGTH)

  try {
    await telnyxClient.sendSMS(to, message, fromNumber)
    // Mirror to the platform admin so we see every booking land across
    // all clients without logging into each dashboard. Fire-and-forget;
    // a failure here NEVER blocks the primary owner notification.
    void import('./admin-notify').then(({ sendAdminCopyIfDistinct }) =>
      sendAdminCopyIfDistinct({
        clientName: (biz as any).business_name || 'client',
        ownerPhone: to,
        kind: ctx.is_emergency ? 'dispatch' : 'booking',
        body: message,
      }),
    ).catch(() => { /* admin-copy is best-effort */ })
  } catch (sendErr) {
    // Don't swallow - the caller (Retell webhook) catches and logs warn,
    // but a persistent failure means contractors miss bookings. Loud
    // log + admin notification.
    const errMsg = sendErr instanceof Error ? sendErr.message : 'Unknown'
    logger.error('booking-notification send failed', { businessId, to, error: errMsg })
    try {
      await notifyAdmin({
        type: 'booking_notification.send_failed',
        severity: 'warning',
        title: 'Booking SMS failed to send',
        body: `Telnyx rejected booking notification for business ${businessId} to ${to}. Error: ${errMsg}. Likely missing messaging-profile attachment.`,
        metadata: { business_id: businessId, to, error: errMsg },
      })
    } catch { /* non-fatal */ }
    throw sendErr
  }

  // Log to sms_messages for audit. Best-effort - the send already
  // succeeded by this point.
  try {
    await supabaseAdmin.from('sms_messages').insert({
      business_id: businessId,
      to_phone: to,
      from_phone: fromNumber,
      message,
      direction: 'outbound',
      status: 'sent',
      type: 'booking_notification',
    })
  } catch { /* schema may differ; skip on error */ }

  return { sent: true }
}
