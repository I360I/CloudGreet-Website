import { resolveCalleeState } from '@/lib/compliance/call-recording'

/*
 * Scheduling helpers so a demo/callback time is interpreted in the
 * PROSPECT's timezone, not the setter's browser timezone. Critical
 * because our setter (Ed) dials from the Philippines (UTC+8): a
 * datetime-local "10:00 AM" run through `new Date()` was being stored
 * as 10 AM Manila = the middle of the previous US night.
 */

// Primary timezone per US state (single-zone assumption; fine for
// scheduling a sales demo - we don't split FL/TX/etc panhandles).
const STATE_TZ: Record<string, string> = {
  AL:'America/Chicago', AK:'America/Anchorage', AZ:'America/Phoenix', AR:'America/Chicago',
  CA:'America/Los_Angeles', CO:'America/Denver', CT:'America/New_York', DE:'America/New_York',
  DC:'America/New_York', FL:'America/New_York', GA:'America/New_York', HI:'Pacific/Honolulu',
  ID:'America/Boise', IL:'America/Chicago', IN:'America/Indiana/Indianapolis', IA:'America/Chicago',
  KS:'America/Chicago', KY:'America/New_York', LA:'America/Chicago', ME:'America/New_York',
  MD:'America/New_York', MA:'America/New_York', MI:'America/Detroit', MN:'America/Chicago',
  MS:'America/Chicago', MO:'America/Chicago', MT:'America/Denver', NE:'America/Chicago',
  NV:'America/Los_Angeles', NH:'America/New_York', NJ:'America/New_York', NM:'America/Denver',
  NY:'America/New_York', NC:'America/New_York', ND:'America/Chicago', OH:'America/New_York',
  OK:'America/Chicago', OR:'America/Los_Angeles', PA:'America/New_York', RI:'America/New_York',
  SC:'America/New_York', SD:'America/Chicago', TN:'America/Chicago', TX:'America/Chicago',
  UT:'America/Denver', VT:'America/New_York', VA:'America/New_York', WA:'America/Los_Angeles',
  WV:'America/New_York', WI:'America/Chicago', WY:'America/Denver',
}

/** The prospect's IANA timezone from their state (or area code), or null. */
export function leadTimeZone(state: string | null | undefined, phone: string | null | undefined): string | null {
  const s = resolveCalleeState(state, phone)
  return (s && STATE_TZ[s]) || null
}

/**
 * Convert a wall-clock "YYYY-MM-DDTHH:mm" (from a datetime-local input)
 * to a UTC ISO string, treating the wall time as being IN `timeZone`.
 * Falls back to browser-local parsing if the string is unexpected.
 */
export function wallClockToUtc(wallClock: string, timeZone: string): string {
  const m = wallClock.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return new Date(wallClock).toISOString()
  const y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5]
  const asUtc = Date.UTC(y, mo - 1, d, h, mi)
  // What wall time does that UTC instant read as in the target zone?
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const parts = dtf.formatToParts(new Date(asUtc))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  let hour = get('hour'); if (hour === 24) hour = 0
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'))
  const offset = shown - asUtc // ms the zone is ahead of UTC
  return new Date(asUtc - offset).toISOString()
}

/** Today's calendar date + weekday AS SEEN in `timeZone`. */
export function tzToday(timeZone: string): { y: number; mo: number; d: number; dow: number } {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const g = (t: string) => p.find((x) => x.type === t)?.value || ''
  const dow: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { y: +g('year'), mo: +g('month'), d: +g('day'), dow: dow[g('weekday')] ?? 0 }
}

/** UTC ISO for "date N days ahead (in `timeZone`) at hour:minute local". */
export function wallClockAhead(timeZone: string, addDays: number, hour: number, minute = 0): string {
  const t = tzToday(timeZone)
  const target = new Date(t.y, t.mo - 1, t.d + addDays) // calendar math only
  const pad = (n: number) => String(n).padStart(2, '0')
  const wall = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(hour)}:${pad(minute)}`
  return wallClockToUtc(wall, timeZone)
}

/** Short zone label like "CDT" for a given zone + date (for UI hints). */
export function tzAbbrev(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(date).find((p) => p.type === 'timeZoneName')?.value || ''
}
