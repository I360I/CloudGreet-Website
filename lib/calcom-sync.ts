import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { listBookings, type CalcomBookingListItem } from '@/lib/calcom'

/**
 * Cal.com → local appointments reconciliation.
 *
 * The webhook is the real-time path. This is the backstop that catches
 * everything the webhook missed: a registration that silently failed at
 * onboarding, a webhook delivery that timed out, a booking made directly
 * in Cal.com after the contractor disabled the integration there, a
 * status change (cancel / reschedule) the webhook fumbled.
 *
 * For one business: pulls bookings in [now - lookbackDays, now + horizonDays]
 * and upserts each into the appointments table by cal_com_booking_uid.
 * Mirrors status changes from Cal.com onto existing local rows so a
 * cancellation made inside Cal.com clears the dashboard slot.
 */

export type CalcomSyncResult = {
  business_id: string
  scanned: number
  inserted: number
  updated: number
  skipped: number
  errors: number
}

export async function syncBusinessCalendar(args: {
  businessId: string
  apiKey: string
  lookbackDays?: number
  horizonDays?: number
}): Promise<CalcomSyncResult> {
  const { businessId, apiKey } = args
  const lookbackDays = args.lookbackDays ?? 2
  const horizonDays = args.horizonDays ?? 60
  const now = Date.now()
  const afterStart = new Date(now - lookbackDays * 86400 * 1000).toISOString()
  const beforeEnd = new Date(now + horizonDays * 86400 * 1000).toISOString()

  const result: CalcomSyncResult = {
    business_id: businessId,
    scanned: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  }

  let live: CalcomBookingListItem[] = []
  try {
    live = await listBookings(apiKey, { afterStart, beforeEnd })
  } catch (e) {
    logger.warn('calcom sync: list-bookings failed', {
      businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    result.errors += 1
    return result
  }

  result.scanned = live.length
  if (live.length === 0) return result

  const uids = live.map((b) => b.uid).filter(Boolean)
  const { data: existingRows } = await supabaseAdmin
    .from('appointments')
    .select('id, cal_com_booking_uid, status, scheduled_date, start_time, end_time, customer_name, service_type')
    .eq('business_id', businessId)
    .in('cal_com_booking_uid', uids)
  const existingByUid = new Map<string, any>()
  for (const r of existingRows || []) {
    if (r.cal_com_booking_uid) existingByUid.set(r.cal_com_booking_uid, r)
  }

  for (const b of live) {
    if (!b?.uid || !b.start) { result.skipped += 1; continue }
    const start = new Date(b.start)
    if (isNaN(start.getTime())) { result.skipped += 1; continue }
    const end = b.end ? new Date(b.end) : null
    const durationMin = end ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)) : 60

    const status = mapStatus(b.status)
    const attendee = b.attendees?.[0]
    const customer_name = attendee?.name || b.title || 'Cal.com booking'
    const customer_email = attendee?.email || null
    const customer_phone = attendee?.phoneNumber || null
    const service_type = b.eventType?.title || b.title || 'Appointment'

    const existing = existingByUid.get(b.uid)
    if (existing) {
      // Only patch if something actually changed - avoids needless writes
      // and keeps updated_at stable for the dashboard's caching.
      const newDate = start.toISOString().slice(0, 10)
      const newStart = start.toISOString()
      const newEnd = end ? end.toISOString() : null
      const drift =
        existing.status !== status ||
        existing.scheduled_date !== newDate ||
        existing.start_time !== newStart ||
        existing.end_time !== newEnd ||
        existing.customer_name !== customer_name ||
        existing.service_type !== service_type
      if (!drift) { result.skipped += 1; continue }

      const { error } = await supabaseAdmin
        .from('appointments')
        .update({
          scheduled_date: newDate,
          start_time: newStart,
          end_time: newEnd,
          duration: durationMin,
          status,
          customer_name,
          service_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (error) {
        logger.warn('calcom sync: update failed', { businessId, uid: b.uid, error: error.message })
        result.errors += 1
      } else {
        result.updated += 1
      }
      continue
    }

    // No local row yet. Skip cancellations - we don't want to materialize
    // a row just to mark it cancelled, that pollutes the calendar.
    if (status === 'cancelled') { result.skipped += 1; continue }

    const { error } = await supabaseAdmin.from('appointments').insert({
      business_id: businessId,
      customer_name,
      customer_email,
      customer_phone,
      service_type,
      scheduled_date: start.toISOString().slice(0, 10),
      start_time: start.toISOString(),
      end_time: end ? end.toISOString() : null,
      duration: durationMin,
      status,
      cal_com_booking_uid: b.uid,
      cal_com_booking_id: b.id || null,
    })
    if (error) {
      logger.warn('calcom sync: insert failed', { businessId, uid: b.uid, error: error.message })
      result.errors += 1
    } else {
      result.inserted += 1
    }
  }

  return result
}

function mapStatus(s: string | undefined): string {
  if (!s) return 'scheduled'
  const lower = s.toLowerCase()
  if (lower.includes('cancel') || lower.includes('reject')) return 'cancelled'
  if (lower === 'pending' || lower === 'awaiting_host') return 'pending'
  if (lower === 'completed' || lower === 'meeting_ended') return 'completed'
  return 'scheduled'
}

/**
 * Sweep every business that has a Cal.com api key and reconcile their
 * appointments. Called from the cron worker.
 */
export async function syncAllCalendars(): Promise<{
  businesses: number
  totals: { inserted: number; updated: number; skipped: number; errors: number }
  per_business: CalcomSyncResult[]
}> {
  const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, cal_com_api_key')
    .not('cal_com_api_key', 'is', null)

  const totals = { inserted: 0, updated: 0, skipped: 0, errors: 0 }
  const per: CalcomSyncResult[] = []
  for (const biz of businesses || []) {
    if (!biz.cal_com_api_key) continue
    const r = await syncBusinessCalendar({ businessId: biz.id, apiKey: biz.cal_com_api_key })
    per.push(r)
    totals.inserted += r.inserted
    totals.updated += r.updated
    totals.skipped += r.skipped
    totals.errors += r.errors
  }
  return { businesses: per.length, totals, per_business: per }
}
