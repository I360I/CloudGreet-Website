/**
 * Business-hours helpers for sales follow-up scheduling.
 *
 * The bug we hit: `new Date(); d.setHours(9,0,0,0)` uses the SERVER's
 * local timezone (UTC on Vercel). 9am UTC = 4am Central. Reps were
 * seeing follow-up callbacks scheduled for 4 AM, which is exactly what
 * a contractor doesn't want to wake up to.
 *
 * Fix: compute "9 AM in the rep's local timezone" using
 * Intl.DateTimeFormat with timeZone, then convert to UTC ISO.
 *
 * Default TZ is America/Chicago (most reps + clients are TX-based).
 * If a rep ever has their own TZ, pass it explicitly.
 */

const DEFAULT_TZ = 'America/Chicago'
const BUSINESS_START = 9   // 9am local
const BUSINESS_END = 18    // 6pm local

/**
 * Return a UTC Date that represents "the given hour:minute on the
 * given calendar day in the target timezone." Handles DST.
 */
export function setLocalTimeInTz(
  d: Date,
  hour: number,
  minute: number = 0,
  timezone: string = DEFAULT_TZ,
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

    const localIso = `${y}-${m}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
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

function getLocalHour(d: Date, timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: 'numeric', hour12: false,
    })
    const parts = fmt.formatToParts(d)
    const h = parts.find((p) => p.type === 'hour')?.value
    return h ? parseInt(h, 10) : d.getUTCHours()
  } catch {
    return d.getUTCHours()
  }
}

function getLocalDayOfWeek(d: Date, timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, weekday: 'short',
    })
    const v = fmt.format(d)
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v)
  } catch {
    return d.getUTCDay()
  }
}

/**
 * Clamp a candidate datetime into the next 9am-6pm business slot
 * (Mon-Fri) in the target timezone. If the candidate is already in
 * window, return it. If it's before 9am, push to 9am same day. If
 * it's after 6pm or weekend, push to 9am next business day.
 */
export function clampToBusinessHours(
  candidate: Date,
  timezone: string = DEFAULT_TZ,
): Date {
  let d = new Date(candidate)
  for (let i = 0; i < 8; i++) {  // safety cap on the loop
    const dow = getLocalDayOfWeek(d, timezone)
    const hour = getLocalHour(d, timezone)
    const isWeekend = dow === 0 || dow === 6
    if (!isWeekend && hour >= BUSINESS_START && hour < BUSINESS_END) {
      return d
    }
    if (isWeekend || hour >= BUSINESS_END) {
      // Push to next day at BUSINESS_START
      const next = new Date(d)
      next.setUTCDate(next.getUTCDate() + 1)
      d = setLocalTimeInTz(next, BUSINESS_START, 0, timezone)
      continue
    }
    if (hour < BUSINESS_START) {
      d = setLocalTimeInTz(d, BUSINESS_START, 0, timezone)
      continue
    }
  }
  return d
}

/**
 * Build a follow-up time `daysFromNow` days from now at `hour` local,
 * then clamp into business hours (Mon-Fri 9am-6pm). Default 9am Central.
 */
export function nextBusinessSlot(args: {
  daysFromNow?: number
  hour?: number
  minute?: number
  timezone?: string
} = {}): Date {
  const days = args.daysFromNow ?? 2
  const tz = args.timezone || DEFAULT_TZ
  const hour = args.hour ?? BUSINESS_START
  const minute = args.minute ?? 0

  const seed = new Date()
  seed.setUTCDate(seed.getUTCDate() + days)
  const candidate = setLocalTimeInTz(seed, hour, minute, tz)
  return clampToBusinessHours(candidate, tz)
}

export { DEFAULT_TZ as SALES_DEFAULT_TZ, BUSINESS_START, BUSINESS_END }
