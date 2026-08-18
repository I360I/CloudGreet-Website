import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

/**
 * Demo calendar mirror.
 *
 * Reads every rep's Cal.com upcoming demos and mirrors each onto the owner's
 * personal `cloudgreet` Cal.com hub (event type HUB_EVENT_TYPE_ID). That hub's
 * destination calendar is the owner's Apple iCloud, so the booking lands on his
 * Apple automatically. Because Cal.com performs the calendar write, this needs
 * only the Cal.com API keys we already store on sales_reps - no Google/Apple
 * OAuth.
 *
 * Idempotent + self-healing via public.demo_calendar_mirrors:
 *  - a rep demo with no mapping row  -> create a hub booking, insert 'active'.
 *  - a mapped rep demo that vanished from the rep's upcoming list:
 *      * if its start is in the past -> the demo simply happened; mark
 *        'completed' and LEAVE the mirror in place (past event stays visible).
 *      * if its start is still in the future -> it was cancelled or rescheduled
 *        (reschedule mints a new rep uid, handled as a fresh create); cancel the
 *        hub booking and mark 'cancelled'.
 *
 * Best-effort throughout: one rep or one booking failing never aborts the tick.
 */

const CAL_API = 'https://api.cal.com/v2'
const HUB_EVENT_TYPE_ID = 5553191 // cal.com/cloudgreet/demo -> destination = owner Apple iCloud
const MIRROR_ATTENDEE_EMAIL = 'aedwards4242@gmail.com'
const MIRROR_ATTENDEE_TZ = 'America/New_York'

type RepAccount = { url: string; key: string }
type UpcomingDemo = { repUid: string; repUrl: string; start: string; prospect: string; zoom: string; repKey: string }

function calHeaders(key: string, json = false): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'cal-api-version': '2024-08-13',
    Accept: 'application/json',
  }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

/** The prospect name/email from a rep booking, excluding internal @cloudgreet.com guests. */
function prospectFromBooking(b: any): string {
  const ext = (b?.attendees || []).find((a: any) => a?.email && !String(a.email).endsWith('@cloudgreet.com'))
  return ext?.name || ext?.email || b?.title || 'Demo'
}

async function loadRepAccounts(): Promise<{ hubKey: string; reps: RepAccount[] }> {
  const { data, error } = await supabaseAdmin
    .from('sales_reps')
    .select('cal_api_key, booking_url')
    .not('cal_api_key', 'is', null)
  if (error) throw new Error('load sales_reps failed: ' + error.message)
  let hubKey = ''
  const reps: RepAccount[] = []
  for (const r of data || []) {
    const url = String((r as any).booking_url || '')
    const key = String((r as any).cal_api_key || '')
    if (!key) continue
    if (url.includes('cal.com/cloudgreet/')) { hubKey = key; continue } // the hub itself - never mirror from it
    reps.push({ url, key })
  }
  if (!hubKey) throw new Error('cloudgreet hub Cal.com key not found on any sales_reps row')
  return { hubKey, reps }
}

async function fetchUpcoming(rep: RepAccount): Promise<UpcomingDemo[]> {
  const res = await fetch(`${CAL_API}/bookings?status=upcoming&take=50`, { headers: calHeaders(rep.key), cache: 'no-store' })
  if (!res.ok) {
    logger.warn('demo-mirror: rep upcoming fetch failed', { url: rep.url, status: res.status })
    return []
  }
  const json: any = await res.json().catch(() => ({}))
  const items: any[] = Array.isArray(json?.data) ? json.data : []
  const now = Date.now()
  return items
    .filter((b) => b?.start && new Date(b.start).getTime() > now && String(b?.status || '').toLowerCase() !== 'cancelled')
    .map((b) => ({
      repUid: String(b.uid),
      repUrl: rep.url,
      start: String(b.start),
      prospect: prospectFromBooking(b),
      zoom: typeof b.location === 'string' ? b.location : '',
      repKey: rep.key,
    }))
}

async function createHubMirror(hubKey: string, demo: UpcomingDemo): Promise<string | null> {
  const notes = `Rep demo mirror. Prospect: ${demo.prospect}. Source: ${demo.repUrl} (uid ${demo.repUid}).${demo.zoom ? ` Demo Zoom: ${demo.zoom}` : ''}`
  const body: any = {
    start: demo.start,
    eventTypeId: HUB_EVENT_TYPE_ID,
    attendee: { name: `${demo.prospect} (demo)`, email: MIRROR_ATTENDEE_EMAIL, timeZone: MIRROR_ATTENDEE_TZ, language: 'en' },
    bookingFieldsResponses: { notes },
  }
  let res = await fetch(`${CAL_API}/bookings`, { method: 'POST', headers: calHeaders(hubKey, true), body: JSON.stringify(body) })
  if (!res.ok) {
    delete body.bookingFieldsResponses // some event-type configs reject unknown fields
    body.metadata = {}
    res = await fetch(`${CAL_API}/bookings`, { method: 'POST', headers: calHeaders(hubKey, true), body: JSON.stringify(body) })
  }
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || !json?.data?.uid) {
    logger.warn('demo-mirror: hub create failed', { repUid: demo.repUid, status: res.status, body: JSON.stringify(json).slice(0, 200) })
    return null
  }
  return String(json.data.uid)
}

async function cancelHubMirror(hubKey: string, hubUid: string): Promise<boolean> {
  const res = await fetch(`${CAL_API}/bookings/${hubUid}/cancel`, {
    method: 'POST', headers: calHeaders(hubKey, true),
    body: JSON.stringify({ cancellationReason: 'Source demo was cancelled or rescheduled' }),
  })
  if (!res.ok) { logger.warn('demo-mirror: hub cancel failed', { hubUid, status: res.status }); return false }
  return true
}

export type DemoMirrorSummary = { scanned: number; created: number; completed: number; cancelled: number; errors: number }

export async function mirrorDemoCalendars(): Promise<DemoMirrorSummary> {
  const summary: DemoMirrorSummary = { scanned: 0, created: 0, completed: 0, cancelled: 0, errors: 0 }
  const { hubKey, reps } = await loadRepAccounts()

  // 1) Gather all current upcoming rep demos.
  const upcoming: UpcomingDemo[] = []
  for (const rep of reps) {
    try { upcoming.push(...(await fetchUpcoming(rep))) }
    catch (e) { summary.errors++; logger.warn('demo-mirror: rep scan threw', { url: rep.url, error: e instanceof Error ? e.message : 'unknown' }) }
  }
  summary.scanned = upcoming.length
  const upcomingByUid = new Map(upcoming.map((d) => [d.repUid, d]))

  // 2) Load existing active mappings.
  const { data: mapped, error: mapErr } = await supabaseAdmin
    .from('demo_calendar_mirrors')
    .select('rep_booking_uid, hub_booking_uid, start_time, status')
    .eq('status', 'active')
  if (mapErr) throw new Error('load mirrors failed: ' + mapErr.message)
  const activeUids = new Set((mapped || []).map((m: any) => m.rep_booking_uid))

  // 3) Create mirrors for new demos.
  for (const demo of upcoming) {
    if (activeUids.has(demo.repUid)) continue
    const hubUid = await createHubMirror(hubKey, demo)
    if (!hubUid) { summary.errors++; continue }
    const { error } = await supabaseAdmin.from('demo_calendar_mirrors').upsert({
      rep_booking_uid: demo.repUid, rep_booking_url: demo.repUrl, hub_booking_uid: hubUid,
      prospect: demo.prospect, start_time: demo.start, status: 'active', updated_at: new Date().toISOString(),
    }, { onConflict: 'rep_booking_uid' })
    if (error) { summary.errors++; logger.warn('demo-mirror: mapping insert failed', { repUid: demo.repUid, error: error.message }); continue }
    summary.created++
    logger.info('demo-mirror: created', { prospect: demo.prospect, start: demo.start })
  }

  // 4) Reconcile mappings whose source demo is gone from upcoming.
  const now = Date.now()
  for (const m of mapped || []) {
    if (upcomingByUid.has((m as any).rep_booking_uid)) continue
    const startMs = (m as any).start_time ? new Date((m as any).start_time).getTime() : 0
    if (startMs && startMs < now) {
      // The demo simply happened - keep the mirror as a past event.
      await supabaseAdmin.from('demo_calendar_mirrors')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('rep_booking_uid', (m as any).rep_booking_uid)
      summary.completed++
    } else {
      // Still future but gone -> cancelled/rescheduled upstream. Cancel the mirror.
      const ok = await cancelHubMirror(hubKey, (m as any).hub_booking_uid)
      await supabaseAdmin.from('demo_calendar_mirrors')
        .update({ status: ok ? 'cancelled' : 'active', updated_at: new Date().toISOString() })
        .eq('rep_booking_uid', (m as any).rep_booking_uid)
      if (ok) summary.cancelled++; else summary.errors++
    }
  }

  return summary
}
