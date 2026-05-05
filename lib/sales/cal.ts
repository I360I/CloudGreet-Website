import { logger } from '../monitoring'

/**
 * Tiny Cal.com v2 client used by the rep dashboard to surface
 * upcoming bookings on the overview "Call list".
 *
 * Each rep stores their own personal API key (cal.com → Settings
 * → Developer → API keys) on their sales_reps row. We pass it as
 * Bearer auth to api.cal.com/v2.
 *
 * We deliberately keep this read-only and best-effort: any failure
 * (bad key, rate limit, network) just returns an empty list with a
 * logged warning so the dashboard never blocks on Cal.
 */

const CAL_API = 'https://api.cal.com/v2'

export type CalBooking = {
  id: string | number
  /** Cal.com's URL-safe slug - used to deep-link to the booking on app.cal.com. */
  uid: string | null
  title: string
  start_iso: string
  end_iso: string
  status: string
  attendees: Array<{ name: string | null; email: string | null }>
}

export async function fetchUpcomingCalBookings(
  apiKey: string,
  opts?: { take?: number },
): Promise<CalBooking[]> {
  if (!apiKey) return []
  const take = opts?.take ?? 10
  const after = new Date().toISOString()

  try {
    const url = `${CAL_API}/bookings?status=upcoming&take=${take}&afterStart=${encodeURIComponent(after)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'cal-api-version': '2024-08-13',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('Cal.com bookings fetch failed', {
        status: res.status, body: body.slice(0, 200),
      })
      return []
    }
    const json = await res.json().catch(() => ({} as any))
    // v2 wraps payload in { status, data } - be defensive about shape.
    const items: any[] =
      Array.isArray(json?.data) ? json.data
      : Array.isArray(json?.bookings) ? json.bookings
      : Array.isArray(json) ? json
      : []
    const now = Date.now()
    return items
      .map((b: any): CalBooking => ({
        id: b.id ?? b.uid ?? '',
        uid: typeof b.uid === 'string' ? b.uid : (typeof b.id === 'string' ? b.id : null),
        title: String(b.title || b.eventType?.title || 'Booking'),
        start_iso: String(b.start || b.startTime || ''),
        end_iso: String(b.end || b.endTime || ''),
        status: String(b.status || 'unknown').toLowerCase(),
        attendees: Array.isArray(b.attendees)
          ? b.attendees.map((a: any) => ({ name: a?.name || null, email: a?.email || null }))
          : [],
      }))
      .filter((b) => b.start_iso && new Date(b.start_iso).getTime() > now)
      .sort((a, b) => new Date(a.start_iso).getTime() - new Date(b.start_iso).getTime())
      .slice(0, take)
  } catch (e) {
    logger.warn('Cal.com fetch threw', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return []
  }
}

export function maskApiKey(key: string | null | undefined): string {
  if (!key) return ''
  if (key.length < 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}
