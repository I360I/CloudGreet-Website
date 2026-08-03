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
 * Contract (from Steve's CLOUDGREET_API.md, 2026-08-02):
 *   Base URL: SMARTRIDE_API_BASE (default https://book.smartridecentralohio.com)
 *   Auth:     Authorization: Bearer <SMARTRIDE_API_KEY>
 *   Quote:    POST /api/cloudgreet/quote
 *   Booking:  POST /api/booking   (also needs a unique Idempotency-Key header)
 *
 * The API key lives ONLY in Vercel env / secret storage, never in a prompt
 * or browser. Airport trips only for now; non-airport rides are handled by
 * transferring/texting Steve directly (per his email).
 *
 * NOTE: the exact quote-response price field name and the booking status
 * enum are still being confirmed with Steve. quoteAirport/bookAirport return
 * the raw parsed JSON so the tool layer relays whatever he sends without this
 * client hard-coding a field name it can't yet verify.
 */

import { logger } from '@/lib/monitoring'

const DEFAULT_BASE = 'https://book.smartridecentralohio.com'

function baseUrl(): string {
  return (process.env.SMARTRIDE_API_BASE || DEFAULT_BASE).replace(/\/+$/, '')
}

function apiKey(): string | null {
  const k = (process.env.SMARTRIDE_API_KEY || '').trim()
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
export async function quoteAirport(input: SmartRideQuoteInput): Promise<SmartRideResult<Record<string, unknown>>> {
  return call<Record<string, unknown>>('/api/cloudgreet/quote', input)
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
  return call<Record<string, unknown>>('/api/booking', input, { 'Idempotency-Key': key })
}
