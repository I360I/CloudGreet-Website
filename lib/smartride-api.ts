/**
 * Smart Ride Central Ohio - airport quote + booking API client.
 *
 * Steve French runs his own server-authoritative quoting and booking system
 * and exposes two endpoints for CloudGreet's AI to call. His system owns ALL
 * business logic (mileage, pricing, taxes, airport fees, surcharges, and
 * availability) - one source of truth. Our agent only gathers trip info,
 * calls these endpoints, and relays the response. We never calculate or
 * trust a price on our side.
 *
 * Contract (verified live against Steve's sandbox, 2026-08-03):
 *   Base URL: SMARTRIDE_API_BASE (default https://book.smartridecentralohio.com)
 *   Auth:     Authorization: Bearer <SMARTRIDE_API_KEY>
 *   Mode:     SMARTRIDE_MODE = 'sandbox' (default) | 'production'
 *     sandbox    -> POST /api/cloudgreet/sandbox/quote  + /api/cloudgreet/sandbox/booking
 *                   (bookings simulated: saved:false, no email/SMS sent; safe to test)
 *     production -> POST /api/cloudgreet/quote          + /api/booking
 *                   (real bookings; only after Steve issues production credentials)
 *   Booking also needs a unique Idempotency-Key header (<=200 chars).
 *
 * The API key lives ONLY in Vercel env / secret storage, never in a prompt,
 * browser, log, or repo. Airport trips only for now; non-airport rides are
 * handled by transferring/texting Steve directly (per his email).
 *
 * Response shape (from his sandbox guide): quote total is `quote.pricing.total`
 * with `quote.currency`; availability is `availability.available` (an HTTP 200
 * does NOT by itself mean available). A booking returns `reference`,
 * `status` ("pending"), and `saved` - treat `saved:false` as authoritative
 * "no real booking exists". Never book when the status is not 200, `ok` is
 * not true, or `availability.available` is not true.
 */

import { logger } from '@/lib/monitoring'

const DEFAULT_BASE = 'https://book.smartridecentralohio.com'

function baseUrl(): string {
  return (process.env.SMARTRIDE_API_BASE || DEFAULT_BASE).replace(/\/+$/, '')
}

function isSandbox(): boolean {
  // Default to sandbox until Steve issues production credentials, so we can
  // never accidentally submit a real booking against an unreviewed integration.
  return (process.env.SMARTRIDE_MODE || 'sandbox').toLowerCase() !== 'production'
}

const QUOTE_PATH = () => isSandbox() ? '/api/cloudgreet/sandbox/quote' : '/api/cloudgreet/quote'
const BOOK_PATH = () => isSandbox() ? '/api/cloudgreet/sandbox/booking' : '/api/booking'

function apiKey(): string | null {
  // Production mode prefers the dedicated live key (SMARTRIDE_API_KEY_PROD) so
  // the sandbox key can stay staged in the same env without ever being used
  // against real endpoints. Sandbox mode always uses the generic sandbox key.
  // Falls back to SMARTRIDE_API_KEY in production if no prod-specific key is set.
  const prod = (process.env.SMARTRIDE_API_KEY_PROD || '').trim()
  const generic = (process.env.SMARTRIDE_API_KEY || '').trim()
  const k = isSandbox() ? generic : (prod || generic)
  return k || null
}

/** True once the key is configured - lets callers gate the integration on/off. */
export function smartRideConfigured(): boolean {
  return apiKey() !== null
}

export type SmartRideAirport =
  | 'CMH' | 'LCK' | 'LANE_CMH' | 'SIGNATURE_CMH' | 'NETJETS_CMH' | 'OSU_FBO' | 'RICKENBACKER_FBO'

export type SmartRideQuoteInput = {
  tripType: 'One Way' | 'Round Trip'
  direction: 'To the airport' | 'From the airport'
  airport: SmartRideAirport
  localAddress: string
  pickupDate: string        // YYYY-MM-DD
  pickupTime: string        // HH:MM 24h, America/New_York
  stopCount?: 0 | 1 | 2
  stop1Address?: string
  stop2Address?: string
  returnDate?: string       // round trip
  returnTime?: string       // round trip
  passengers?: number
  checkedBags?: number
  carryOns?: number
  carSeats?: number
}

export type SmartRideBookingInput = SmartRideQuoteInput & {
  firstName: string
  lastName: string
  phone: string
  email: string
  flightNumber?: string
  returnFlightNumber?: string
  specialItems?: string
  notes?: string
}

export type SmartRideResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; detail?: unknown }

async function call<T>(
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<SmartRideResult<T>> {
  const key = apiKey()
  if (!key) {
    return { ok: false, status: 0, error: 'smartride_not_configured', detail: 'SMARTRIDE_API_KEY is not set.' }
  }
  const url = `${baseUrl()}${path}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      // Steve's server does the heavy lifting (routing + pricing); give it room.
      signal: AbortSignal.timeout(20_000),
    })
    let parsed: any = null
    const text = await res.text()
    try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
    if (!res.ok) {
      logger.warn('SmartRide API non-2xx', { path, status: res.status, detail: typeof parsed === 'string' ? parsed.slice(0, 300) : parsed })
      return { ok: false, status: res.status, error: 'smartride_api_error', detail: parsed }
    }
    return { ok: true, status: res.status, data: parsed as T }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    logger.error('SmartRide API request failed', { path, error: msg })
    return { ok: false, status: 0, error: 'smartride_network_error', detail: msg }
  }
}

/**
 * Get an authoritative airport quote. The response carries Steve's route,
 * price, and calendar availability. A calendar conflict is advisory - the
 * agent may still offer to submit the request for Steve's review.
 */
export async function quoteAirport(input: SmartRideQuoteInput): Promise<SmartRideResult<SmartRideQuoteResponse>> {
  return call<SmartRideQuoteResponse>(QUOTE_PATH(), { serviceType: 'Airport Transportation', ...input })
}

/**
 * Submit a caller-approved airport booking request. Requires a stable
 * Idempotency-Key (call/conversation id + suffix) so a tool retry never
 * creates a duplicate booking. Steve's server revalidates and recalculates
 * everything; a success returns HTTP 201 with a Smart Ride `reference`.
 * The agent reads the reference back and says it's PENDING Steve's
 * confirmation - never "confirmed".
 */
export async function bookAirport(
  input: SmartRideBookingInput,
  idempotencyKey: string,
): Promise<SmartRideResult<Record<string, unknown>>> {
  const key = String(idempotencyKey || '').trim()
  if (!key) {
    return { ok: false, status: 0, error: 'missing_idempotency_key', detail: 'A stable Idempotency-Key is required for bookings.' }
  }
  return call<SmartRideBookingResponse>(BOOK_PATH(), { serviceType: 'Airport Transportation', ...input }, { 'Idempotency-Key': key })
}

/* --- Non-airport (unified API v2.0: same endpoints + key, serviceType switch) --- */

export type SmartRideServiceOption =
  | 'Point-to-Point Transfer' | 'Independent Living' | 'Hourly / Event Service' | 'Concert / Sporting Event'

export type SmartRideNonAirportInput = {
  serviceOption: SmartRideServiceOption
  tripType: 'One Way' | 'Round Trip'
  pickup: string
  destination: string
  pickupDate: string        // YYYY-MM-DD
  pickupTime: string        // HH:MM 24h, America/New_York
  serviceHours?: number     // whole number <=12, for Independent Living / Hourly-Event
  stopCount?: 0 | 1 | 2
  stop1Address?: string
  stop2Address?: string
  returnDate?: string       // round trip
  returnTime?: string       // round trip
  passengers?: number
  checkedBags?: number
  carryOns?: number
  carSeats?: number
  promoCode?: string
  notes?: string
}

export type SmartRideNonAirportBookingInput = SmartRideNonAirportInput & {
  firstName: string
  lastName: string
  phone: string
  email: string
}

/** Non-airport quote (point-to-point, independent living, hourly/event, concert/sporting). */
export async function quoteNonAirport(input: SmartRideNonAirportInput): Promise<SmartRideResult<SmartRideQuoteResponse>> {
  return call<SmartRideQuoteResponse>(QUOTE_PATH(), { serviceType: 'Non-Airport Transportation', ...input })
}

/** Submit a caller-approved non-airport booking request. PENDING Steve's review, never "confirmed". */
export async function bookNonAirport(
  input: SmartRideNonAirportBookingInput,
  idempotencyKey: string,
): Promise<SmartRideResult<Record<string, unknown>>> {
  const key = String(idempotencyKey || '').trim()
  if (!key) {
    return { ok: false, status: 0, error: 'missing_idempotency_key', detail: 'A stable Idempotency-Key is required for bookings.' }
  }
  return call<SmartRideBookingResponse>(BOOK_PATH(), { serviceType: 'Non-Airport Transportation', ...input }, { 'Idempotency-Key': key })
}

/* --- Response shapes (from Steve's sandbox guide, verified live) --------- */

export type SmartRideAvailability = {
  available: boolean
  outbound?: { available: boolean; windowStart: string; windowEnd: string; conflictCount: number } | null
  returnRide?: unknown | null
}

export type SmartRideQuoteResponse = {
  ok: boolean
  sandbox?: boolean
  quote: {
    airportLabel?: string
    pickup?: string
    destination?: string
    miles?: number
    pricing: {
      firstLeg?: { total: number; currency?: string; mileageCharge?: number; airportFee?: number; salesTax?: number } | null
      returnLeg?: { total: number } | null
      total: number
    }
    currency?: string
  }
  availability: SmartRideAvailability
  bookingNote?: string | null
}

export type SmartRideBookingResponse = {
  ok: boolean
  sandbox?: boolean
  simulated?: boolean
  saved?: boolean
  reference: string
  status: string        // "pending"
  availability: SmartRideAvailability
  quote?: { pricing?: { total?: number }; currency?: string }
  notifications?: { email?: string; sms?: string }
  message?: string
}
