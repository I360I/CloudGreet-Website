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

export const DEFAULT_BOOKING_SMS_TEMPLATE =
  '[CloudGreet] New booking: {name}, {time}. Service: {service}. Caller: {phone}'

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
    logger.warn('booking-notification skipped - CLOUDGREET_NOTIFICATIONS_FROM unset', { businessId })
    return { sent: false, reason: 'CLOUDGREET_NOTIFICATIONS_FROM env var not set' }
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('notifications_phone, booking_sms_template, business_name')
    .eq('id', businessId)
    .maybeSingle()

  if (!biz) return { sent: false, reason: 'business not found' }

  const to = (biz as any).notifications_phone
  if (!to) {
    logger.warn('booking-notification skipped - business has no notifications_phone', { businessId })
    return { sent: false, reason: 'business has no notifications_phone set' }
  }

  const template = (biz as any).booking_sms_template || DEFAULT_BOOKING_SMS_TEMPLATE
  const finalCtx: BookingNotificationContext = {
    ...ctx,
    business: ctx.business || (biz as any).business_name || null,
  }
  const message = renderTemplate(template, finalCtx).slice(0, TEMPLATE_MAX_LENGTH)

  await telnyxClient.sendSMS(to, message, fromNumber)

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
