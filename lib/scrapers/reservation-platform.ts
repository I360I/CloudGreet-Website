import { logger } from '../monitoring'

/**
 * Reservation-platform detection for restaurant leads.
 *
 * Google Places doesn't expose which reservation system a restaurant uses,
 * but the restaurant's own website does: whatever platform powers their
 * "Reserve" button leaves a recognizable footprint in the page HTML (a
 * widget script, an iframe, or the reservation-link href). We fetch the
 * site and look for those signatures.
 *
 * Why it matters: OpenTable / Resy / Tock are API-gated, so the AI can only
 * deflect to a link. SevenRooms exposes a real availability + booking API,
 * so on those restaurants the AI can actually check times and book the
 * table. Filtering the scrape to SevenRooms restaurants means every lead is
 * one where we can ship the strictly-better product.
 */

export type ReservationPlatform =
  | 'sevenrooms'
  | 'opentable'
  | 'resy'
  | 'tock'
  | 'yelp'
  | 'square'
  | null

// Ordered by our preference: SevenRooms first so a site that references more
// than one platform (e.g. a SevenRooms widget plus an OpenTable backlink)
// resolves to the one we can integrate with.
const SIGNATURES: { platform: NonNullable<ReservationPlatform>; patterns: RegExp[] }[] = [
  {
    platform: 'sevenrooms',
    patterns: [
      /sevenrooms\.com/i,
      /booking-widget\.sevenrooms/i,
      /sevenrooms[-_]widget/i,
      /data-sr-[a-z-]+/i,
      /powered by sevenrooms/i,
    ],
  },
  { platform: 'resy', patterns: [/\bresy\.com/i, /widgets\.resy\.com/i, /resy[-_]button/i] },
  { platform: 'opentable', patterns: [/opentable\.com/i, /opentable[-_]widget/i, /otRestaurant/i] },
  { platform: 'tock', patterns: [/exploretock\.com/i, /\bexploretock\b/i] },
  { platform: 'yelp', patterns: [/yelp\.com\/reservations/i, /yelpreservations/i] },
  { platform: 'square', patterns: [/squareup\.com\/appointments/i, /book\.squareup\.com/i] },
]

function matchPlatform(html: string): ReservationPlatform {
  for (const sig of SIGNATURES) {
    if (sig.patterns.some((re) => re.test(html))) return sig.platform
  }
  return null
}

function normalizeBase(url: string): string | null {
  const raw = (url || '').trim()
  if (!raw) return null
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(withScheme)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

async function fetchHtml(url: string, timeoutMs: number, signal?: AbortSignal): Promise<string | null> {
  const ctrl = new AbortController()
  const onAbort = () => ctrl.abort()
  if (signal) {
    if (signal.aborted) return null
    signal.addEventListener('abort', onAbort, { once: true })
  }
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    })
    if (!res.ok) return null
    const text = await res.text()
    // Cap body so a giant page can't blow memory; the widget markers live
    // near the top (head scripts) or in reservation buttons regardless.
    return text.slice(0, 600_000)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

/**
 * Detect which reservation platform a restaurant's website uses. Checks the
 * homepage first, then a single /reservations page (some sites only embed
 * the widget there). Returns null when nothing recognizable is found or the
 * site can't be fetched. Bounded to at most two short fetches per site.
 */
export async function detectReservationPlatform(
  website: string,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<ReservationPlatform> {
  const timeoutMs = opts.timeoutMs ?? 6000
  const base = normalizeBase(website)
  if (!base) return null

  try {
    const home = await fetchHtml(base, timeoutMs, opts.signal)
    const homeMatch = home ? matchPlatform(home) : null
    if (homeMatch) return homeMatch

    // Only worth a second fetch if the homepage loaded but had no widget -
    // many sites gate the reservation embed behind a /reservations page.
    if (home !== null) {
      const resv = await fetchHtml(`${base}/reservations`, timeoutMs, opts.signal)
      if (resv) return matchPlatform(resv)
    }
    return null
  } catch (e) {
    logger.warn('reservation-platform detect failed', {
      website, error: e instanceof Error ? e.message : 'unknown',
    })
    return null
  }
}
