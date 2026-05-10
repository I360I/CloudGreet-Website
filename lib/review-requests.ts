import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telnyxClient } from '@/lib/telnyx'

/**
 * Review-request automation.
 *
 * Flow:
 *   1. AI books an appointment + captures consent ("ok if we send a
 *      quick follow-up text?"). Appointment row stores review_consent.
 *   2. After booking, scheduleReviewRequest() inserts a queued row
 *      with scheduled_for set per the business's timing pref, clamped
 *      to 9am-7pm local. Skips the row (or never inserts) if consent
 *      missing, opt-out exists, frequency cap hit, or business disabled.
 *   3. Cron worker (daily at 9 AM ET on the Hobby plan; bump to */15
 *      scheduled_for <= now(), renders the template, fires the SMS via
 *      Telnyx, marks status='sent' or 'failed'.
 *   4. STOP/UNSUBSCRIBE inbound webhook writes to review_opt_outs.
 *      Future scheduling for that phone short-circuits.
 */

export const DEFAULT_REVIEW_SMS_TEMPLATE =
  "Hi {first_name}, thanks for choosing {business_name}! If we did a good job, we'd really appreciate a quick Google review: {review_link}. Reply STOP to opt out."

export const FREQUENCY_CAP_DAYS = 90
export const QUIET_HOURS_START = 9   // 9am local
export const QUIET_HOURS_END = 19    // 7pm local

type Timing = '1h_after' | 'evening_same_day' | 'next_morning'

/* ---------- helpers ---------- */

function digitsOnly(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '')
}

function firstName(full: string | null | undefined): string {
  if (!full) return 'there'
  const trimmed = full.trim()
  return trimmed.split(/\s+/)[0] || 'there'
}

export function renderReviewTemplate(
  template: string,
  ctx: { first_name: string; business_name: string; review_link: string },
): string {
  return template
    .replace(/\{first_name\}/g, ctx.first_name)
    .replace(/\{business_name\}/g, ctx.business_name)
    .replace(/\{review_link\}/g, ctx.review_link)
}

/**
 * Compute the target send time per the business's timing preference,
 * then clamp into 9am-7pm local. If the natural send time falls outside
 * quiet hours, we push to the nearest in-window slot.
 */
function computeSendTime(
  appointmentStart: Date,
  timing: Timing,
  timezone: string,
): Date {
  // Build a candidate raw send time
  let candidate = new Date(appointmentStart)
  if (timing === '1h_after') {
    candidate = new Date(appointmentStart.getTime() + 60 * 60 * 1000)
  } else if (timing === 'evening_same_day') {
    candidate = setLocalTimeOnDate(appointmentStart, timezone, 18, 0) // 6pm same day
  } else if (timing === 'next_morning') {
    const next = new Date(appointmentStart)
    next.setUTCDate(next.getUTCDate() + 1)
    candidate = setLocalTimeOnDate(next, timezone, 10, 0) // 10am next day
  }

  // Clamp to quiet hours in business local TZ
  const localHour = getLocalHour(candidate, timezone)
  if (localHour < QUIET_HOURS_START) {
    candidate = setLocalTimeOnDate(candidate, timezone, QUIET_HOURS_START, 0)
  } else if (localHour >= QUIET_HOURS_END) {
    // Push to next morning at 9am local
    const next = new Date(candidate)
    next.setUTCDate(next.getUTCDate() + 1)
    candidate = setLocalTimeOnDate(next, timezone, QUIET_HOURS_START, 0)
  }
  return candidate
}

function getLocalHour(d: Date, timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const parts = fmt.formatToParts(d)
    const h = parts.find((p) => p.type === 'hour')?.value
    return h ? parseInt(h, 10) : d.getUTCHours()
  } catch {
    return d.getUTCHours()
  }
}

/**
 * Take a Date, return a new Date set to a specific hour:minute in the
 * business's local timezone (preserving the calendar day in that TZ).
 * Uses the offset trick: format the date in the target TZ, parse the
 * pieces, build an ISO that represents that wall-clock moment.
 */
function setLocalTimeOnDate(
  d: Date,
  timezone: string,
  hour: number,
  minute: number,
): Date {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = fmt.formatToParts(d)
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const day = parts.find((p) => p.type === 'day')?.value
    if (!y || !m || !day) return d

    // Construct an ISO with the wall-clock components, then resolve to
    // UTC by getting the timezone offset for that instant.
    const localIso = `${y}-${m}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    // Best effort: the offset is the difference between an ISO parsed
    // as UTC and the same wall-clock time interpreted in the TZ.
    const naiveUtc = new Date(`${localIso}Z`)
    const offsetMin = getTzOffsetMinutes(naiveUtc, timezone)
    return new Date(naiveUtc.getTime() - offsetMin * 60 * 1000)
  } catch {
    return d
  }
}

function getTzOffsetMinutes(d: Date, timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const parts = fmt.formatToParts(d)
    const off = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT'
    const m = off.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
    if (!m) return 0
    const sign = m[1] === '-' ? -1 : 1
    return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10))
  } catch {
    return 0
  }
}

/* ---------- main API ---------- */

export type ScheduleResult =
  | { ok: true; review_request_id: string; scheduled_for: string }
  | { ok: false; reason: 'disabled' | 'no_review_url' | 'no_consent' | 'opt_out' | 'frequency_cap' | 'no_phone' | 'db_error' | 'business_not_found'; detail?: string }

/**
 * Called from the AI's book_appointment path right after the
 * appointment row exists. Idempotent: re-running for the same
 * appointment_id is a no-op (uniqueness via appointment_id index).
 */
export async function scheduleReviewRequest(args: {
  appointmentId: string
  businessId: string
  customerPhone: string | null | undefined
  customerName: string | null | undefined
  appointmentStart: Date
  reviewConsent: boolean | null | undefined
}): Promise<ScheduleResult> {
  const { appointmentId, businessId, customerPhone, customerName, appointmentStart, reviewConsent } = args

  if (!customerPhone) return { ok: false, reason: 'no_phone' }
  if (reviewConsent !== true) return { ok: false, reason: 'no_consent' }

  // Idempotency: if a row already exists for this appointment, no-op.
  const { data: existing } = await supabaseAdmin
    .from('review_requests')
    .select('id, status, scheduled_for')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  if (existing) {
    return { ok: true, review_request_id: (existing as any).id, scheduled_for: (existing as any).scheduled_for }
  }

  // Look up business config
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, timezone, review_requests_enabled, google_review_url, review_sms_template, review_send_timing')
    .eq('id', businessId)
    .maybeSingle()
  if (!biz) return { ok: false, reason: 'business_not_found' }

  const enabled = !!(biz as any).review_requests_enabled
  if (!enabled) return { ok: false, reason: 'disabled' }

  const reviewUrl = (biz as any).google_review_url || ''
  if (!reviewUrl) return { ok: false, reason: 'no_review_url' }

  // Opt-out check
  const phoneDigits = digitsOnly(customerPhone)
  const { data: optOut } = await supabaseAdmin
    .from('review_opt_outs')
    .select('phone')
    .eq('phone', phoneDigits)
    .maybeSingle()
  if (optOut) return { ok: false, reason: 'opt_out' }

  // Frequency cap: skip if we've sent to this number in the last 90 days
  const cutoff = new Date(Date.now() - FREQUENCY_CAP_DAYS * 24 * 60 * 60 * 1000)
  const { data: recent } = await supabaseAdmin
    .from('review_requests')
    .select('id, sent_at')
    .eq('business_id', businessId)
    .eq('customer_phone', phoneDigits)
    .gte('sent_at', cutoff.toISOString())
    .limit(1)
  if (recent && recent.length > 0) return { ok: false, reason: 'frequency_cap' }

  const timing = ((biz as any).review_send_timing || '1h_after') as Timing
  const timezone = (biz as any).timezone || 'America/Chicago'
  const scheduledFor = computeSendTime(appointmentStart, timing, timezone)

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('review_requests')
    .insert({
      business_id: businessId,
      appointment_id: appointmentId,
      customer_phone: phoneDigits,
      customer_name: customerName || null,
      scheduled_for: scheduledFor.toISOString(),
      status: 'queued',
    })
    .select('id, scheduled_for')
    .single()

  if (insertErr || !inserted) {
    logger.error('schedule review request: insert failed', {
      error: insertErr?.message || 'no row returned',
      appointmentId,
      businessId,
    })
    return { ok: false, reason: 'db_error', detail: insertErr?.message }
  }

  return { ok: true, review_request_id: (inserted as any).id, scheduled_for: (inserted as any).scheduled_for }
}

/* ---------- cron worker ---------- */

export async function sendDueReviewRequests(opts?: { batchSize?: number }): Promise<{
  attempted: number
  sent: number
  failed: number
  skipped: number
}> {
  const batchSize = opts?.batchSize ?? 50
  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!fromNumber) {
    logger.warn('sendDueReviewRequests: CLOUDGREET_NOTIFICATIONS_FROM not set, skipping')
    return { attempted: 0, sent: 0, failed: 0, skipped: 0 }
  }

  const nowIso = new Date().toISOString()
  const { data: due, error: fetchErr } = await supabaseAdmin
    .from('review_requests')
    .select('id, business_id, customer_phone, customer_name, scheduled_for')
    .eq('status', 'queued')
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(batchSize)

  if (fetchErr) {
    logger.error('sendDueReviewRequests: fetch due failed', { error: fetchErr.message })
    return { attempted: 0, sent: 0, failed: 0, skipped: 0 }
  }
  if (!due || due.length === 0) return { attempted: 0, sent: 0, failed: 0, skipped: 0 }

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const row of due) {
    const id = (row as any).id as string
    const businessId = (row as any).business_id as string
    const customerPhone = (row as any).customer_phone as string
    const customerName = (row as any).customer_name as string | null

    try {
      // Re-check opt-out at send time (someone could've STOP'd between schedule and send)
      const { data: optOut } = await supabaseAdmin
        .from('review_opt_outs')
        .select('phone')
        .eq('phone', customerPhone)
        .maybeSingle()
      if (optOut) {
        await markSkipped(id, 'opt_out')
        skipped++
        continue
      }

      // Re-check business config at send time (could've been disabled / URL removed)
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('business_name, review_requests_enabled, google_review_url, review_sms_template')
        .eq('id', businessId)
        .maybeSingle()
      if (!biz) {
        await markSkipped(id, 'business_not_found')
        skipped++
        continue
      }
      if (!(biz as any).review_requests_enabled) {
        await markSkipped(id, 'disabled')
        skipped++
        continue
      }
      const reviewUrl = (biz as any).google_review_url || ''
      if (!reviewUrl) {
        await markSkipped(id, 'no_review_url')
        skipped++
        continue
      }

      const template = (biz as any).review_sms_template || DEFAULT_REVIEW_SMS_TEMPLATE
      const message = renderReviewTemplate(template, {
        first_name: firstName(customerName),
        business_name: (biz as any).business_name || 'us',
        review_link: reviewUrl,
      })

      const resp = await telnyxClient.sendSMS(customerPhone, message, fromNumber)

      await supabaseAdmin
        .from('review_requests')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          telnyx_message_id: resp?.data?.id || null,
          rendered_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      sent++
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'unknown'
      logger.warn('review request send failed', { id, businessId, error: detail })
      await supabaseAdmin
        .from('review_requests')
        .update({
          status: 'failed',
          failure_reason: detail.slice(0, 300),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      failed++
    }
  }

  return { attempted: due.length, sent, failed, skipped }
}

async function markSkipped(id: string, reason: string): Promise<void> {
  await supabaseAdmin
    .from('review_requests')
    .update({ status: 'skipped', skip_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', id)
}

/* ---------- opt-out ---------- */

export async function markPhoneOptedOut(
  phone: string,
  source: 'stop_keyword' | 'help_keyword' | 'manual' | 'bounce' = 'stop_keyword',
): Promise<void> {
  const phoneDigits = digitsOnly(phone)
  if (!phoneDigits) return
  await supabaseAdmin
    .from('review_opt_outs')
    .upsert({ phone: phoneDigits, source, opted_out_at: new Date().toISOString() }, {
      onConflict: 'phone',
    })
  // Also cancel any queued requests for this phone
  await supabaseAdmin
    .from('review_requests')
    .update({ status: 'canceled', skip_reason: 'opt_out', updated_at: new Date().toISOString() })
    .eq('customer_phone', phoneDigits)
    .eq('status', 'queued')
}

/* ---------- bulk cancel ---------- */

/**
 * Cancel every queued review request for a business. Called when the
 * contractor toggles review requests OFF in their settings - we don't
 * want messages going out for appointments that were queued before they
 * changed their mind.
 */
export async function cancelQueuedForBusiness(businessId: string): Promise<{
  canceled: number
}> {
  const { data, error } = await supabaseAdmin
    .from('review_requests')
    .update({
      status: 'canceled',
      skip_reason: 'business_disabled',
      updated_at: new Date().toISOString(),
    })
    .eq('business_id', businessId)
    .eq('status', 'queued')
    .select('id')

  if (error) {
    logger.warn('cancelQueuedForBusiness failed', { businessId, error: error.message })
    return { canceled: 0 }
  }
  return { canceled: data?.length || 0 }
}

/* ---------- test send ---------- */

/**
 * Send a one-off test SMS using the business's current settings. Used
 * by the "Send test" button in /dashboard/settings so contractors can
 * verify the review URL + template + SMS deliverability without booking
 * a real appointment. Bypasses the queue, frequency cap, opt-out, and
 * quiet-hours checks - it's a manual contractor-initiated send to a
 * number they own.
 */
export async function sendTestReviewSms(args: {
  businessId: string
  toPhone: string
  customerName?: string | null
}): Promise<
  | { ok: true; rendered: string; telnyx_message_id: string | null }
  | { ok: false; reason: string; detail?: string }
> {
  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!fromNumber) return { ok: false, reason: 'notifications_from_unset' }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('business_name, google_review_url, review_sms_template')
    .eq('id', args.businessId)
    .maybeSingle()
  if (!biz) return { ok: false, reason: 'business_not_found' }

  const reviewUrl = (biz as any).google_review_url || ''
  if (!reviewUrl) return { ok: false, reason: 'no_review_url' }

  const template = (biz as any).review_sms_template || DEFAULT_REVIEW_SMS_TEMPLATE
  const rendered = renderReviewTemplate(template, {
    first_name: firstName(args.customerName) || 'there',
    business_name: (biz as any).business_name || 'us',
    review_link: reviewUrl,
  })

  try {
    const resp = await telnyxClient.sendSMS(args.toPhone, rendered, fromNumber)
    return {
      ok: true,
      rendered,
      telnyx_message_id: resp?.data?.id || null,
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown'
    logger.warn('test review SMS failed', { businessId: args.businessId, error: detail })
    return { ok: false, reason: 'send_failed', detail }
  }
}

/* ---------- stats for client dashboard ---------- */

export async function getReviewStats(businessId: string): Promise<{
  queued: number
  sent_last_30d: number
  failed_last_30d: number
  opted_out_count: number  // global - we don't track per-business opt-outs
  last_sent_at: string | null
}> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: queued }, { count: sent }, { count: failed }, { data: lastSent }, { count: optedOut }] = await Promise.all([
    supabaseAdmin
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'queued'),
    supabaseAdmin
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'sent')
      .gte('sent_at', since),
    supabaseAdmin
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'failed')
      .gte('updated_at', since),
    supabaseAdmin
      .from('review_requests')
      .select('sent_at')
      .eq('business_id', businessId)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('review_opt_outs')
      .select('phone', { count: 'exact', head: true }),
  ])

  return {
    queued: queued || 0,
    sent_last_30d: sent || 0,
    failed_last_30d: failed || 0,
    opted_out_count: optedOut || 0,
    last_sent_at: (lastSent as any)?.sent_at || null,
  }
}
