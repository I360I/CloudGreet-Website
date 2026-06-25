/**
 * SmartRide pricing engine + Google Routes drive-time lookup.
 *
 * Extracted from the voice webhook so the SMS agent can call the same
 * logic without HTTP indirection. Pure functions where possible -
 * lookupDriveTime makes Google API calls, computeQuote is deterministic.
 */

import { logger } from './monitoring'

export type DriveTimeResult = {
  ok: true
  minutes: number
  distance_miles: number
  used_traffic: boolean
  origin_county: string | null
  origin_state: string | null
  is_airport_origin: boolean
  spoken_summary: string
} | {
  ok: false
  error: string
  detail?: string
}

export async function lookupDriveTime(args: {
  origin: string
  destination: string
  departure_time?: string
}): Promise<DriveTimeResult> {
  const origin = (args.origin || '').trim()
  const destination = (args.destination || '').trim()
  if (!origin || !destination) {
    return { ok: false, error: 'missing_parameters', detail: 'origin and destination are required' }
  }
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return { ok: false, error: 'no_api_key', detail: 'GOOGLE_PLACES_API_KEY not configured' }

  const body: Record<string, unknown> = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    units: 'IMPERIAL',
  }
  if (args.departure_time) {
    const d = new Date(args.departure_time)
    if (Number.isFinite(d.getTime()) && d.getTime() > Date.now() - 60_000) {
      body.departureTime = d.toISOString()
    }
  }

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText)
      logger.warn('lookupDriveTime: Routes API non-2xx', { status: res.status, body: txt.slice(0, 200) })
      return { ok: false, error: 'google_api_error', detail: `${res.status}: ${txt.slice(0, 200)}` }
    }
    const j = await res.json().catch(() => ({})) as any
    const route = j?.routes?.[0]
    if (!route) return { ok: false, error: 'no_route', detail: `Could not route ${origin} -> ${destination}` }

    const parseDur = (s: any): number | null => {
      if (typeof s !== 'string') return null
      const m = s.match(/^(\d+(?:\.\d+)?)s$/)
      return m ? Math.round(Number(m[1])) : null
    }
    const trafficSec = parseDur(route.duration)
    const staticSec = parseDur(route.staticDuration)
    const seconds = trafficSec ?? staticSec ?? 0
    const minutes = Math.round(seconds / 60)
    const distanceMeters = route.distanceMeters || 0
    const miles = Math.round((distanceMeters / 1609.34) * 10) / 10
    const usedTraffic = trafficSec != null && trafficSec !== staticSec

    let originCounty: string | null = null
    let originState: string | null = null
    let isAirportOrigin = /airport|CMH|LCK|john glenn|rickenbacker/i.test(origin)
    // Pickup-precision gate (same as the voice path): a bare city like
    // "Powell" geocodes to a meaningless centroid, so never quote from it.
    // Require a street-level address; airports/named places exempt. Only
    // enforced on a definitive geocode, so a Geocoding outage doesn't block.
    let originGeocoded = false
    let originPrecise = false
    try {
      const gRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(origin)}&key=${apiKey}`,
      )
      if (gRes.ok) {
        const gj = await gRes.json() as any
        const top = gj?.results?.[0]
        const comps = top?.address_components || []
        for (const c of comps) {
          const types = c.types || []
          if (types.includes('administrative_area_level_2')) {
            originCounty = String(c.long_name || '').replace(/\s*County$/i, '').trim() || null
          }
          if (types.includes('administrative_area_level_1')) {
            originState = c.short_name || null
          }
        }
        const resolved = (top?.formatted_address || '').toLowerCase()
        if (resolved.includes('airport') || resolved.includes('cmh') || resolved.includes('lck')) {
          isAirportOrigin = true
        }
        if (top) {
          originGeocoded = true
          const gtypes: string[] = top.types || []
          const locType: string = top?.geometry?.location_type || ''
          const preciseType = gtypes.some((t) =>
            ['street_address', 'premise', 'subpremise', 'establishment', 'point_of_interest'].includes(t),
          )
          const preciseLoc = locType === 'ROOFTOP' || locType === 'RANGE_INTERPOLATED'
          originPrecise = preciseType || preciseLoc
        }
      }
    } catch { /* best-effort - leaves originGeocoded false, so no block */ }

    if (originGeocoded && !originPrecise && !isAirportOrigin) {
      return {
        ok: false,
        error: 'pickup_not_specific',
        detail: `"${origin}" is only a city or area, not an exact pickup point. Ask the customer for the full pickup street address (house or building number + street) before quoting or booking. Do not quote from a city name alone. Airports and named places are fine.`,
      }
    }

    return {
      ok: true,
      minutes,
      distance_miles: miles,
      used_traffic: usedTraffic,
      origin_county: originCounty,
      origin_state: originState,
      is_airport_origin: isAirportOrigin,
      spoken_summary: `${minutes} minutes${miles ? `, about ${miles} miles` : ''}${usedTraffic ? ' with current traffic' : ''}`,
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown'
    logger.warn('lookupDriveTime fetch failed', { error: detail })
    return { ok: false, error: 'network_error', detail: detail.slice(0, 200) }
  }
}

export type QuoteArgs = {
  service_type: string
  miles?: number
  hours?: number
  pickup_hour_24?: number
  pickup_minute?: number
  origin_county?: string
  cmh_airport?: boolean
  airport_code?: string
}

export type QuoteResult = {
  ok: true
  total_dollars: number
  subtotal_dollars: number
  tax_dollars: number
  county_tax_rate: number | null
  surcharge_rate: number
  used_county: string | null
  lines: Array<{ label: string; amount: string }>
  spoken_summary: string
} | {
  ok: false
  error: string
  detail: string
}

const COUNTY_TAX: Record<string, number> = {
  franklin: 0.0800,
  delaware: 0.0700,
  licking: 0.0725,
  fairfield: 0.0675,
  madison: 0.0700,
  pickaway: 0.0725,
  union: 0.0700,
  morrow: 0.0725,
}

export function computeQuote(args: QuoteArgs): QuoteResult {
  const serviceType = String(args.service_type || '').toLowerCase().replace(/[^a-z_]/g, '')
  const miles = Number(args.miles)
  const hours = Number(args.hours)
  const pickupHour = Number(args.pickup_hour_24)
  const pickupMinute = Number(args.pickup_minute || 0)
  const originCounty = String(args.origin_county || '').trim()
  const isCmh = !!args.cmh_airport || /cmh|john glenn/i.test(String(args.airport_code || ''))

  const taxRate = COUNTY_TAX[originCounty.toLowerCase()] ?? null

  const minOfDay = (h: number, m: number) => (h % 24) * 60 + (m % 60)
  const surchargeFor = (h: number, m: number): number => {
    if (!Number.isFinite(h)) return 0
    const t = minOfDay(h, m)
    if (t >= 23 * 60 && t < 24 * 60) return 0.10
    if (t >= 0 && t < 2 * 60) return 0.15
    if (t >= 2 * 60 && t < 4 * 60) return 0.20
    if (t >= 4 * 60 && t < 5 * 60 + 30) return 0.15
    if (t >= 5 * 60 + 30 && t < 6 * 60 + 45) return 0.10
    return 0
  }
  const surchargeRate = surchargeFor(pickupHour, pickupMinute)

  let baseCents = 0
  const lines: Array<{ label: string; cents: number }> = []
  const note = (label: string, cents: number) => {
    baseCents += cents
    lines.push({ label, cents })
  }

  const svc = serviceType.replace(/[_-]/g, '')
  const MIN_FARE_CENTS = 5000
  if (svc === 'airportdropoff' || svc === 'airportpickup' || svc === 'pointtopoint' || svc === 'p2p' || svc === 'transfer') {
    if (!Number.isFinite(miles) || miles <= 0) {
      return { ok: false, error: 'missing_miles', detail: 'compute_quote needs miles for distance-priced service.' }
    }
    const isOver50 = (svc === 'pointtopoint' || svc === 'p2p' || svc === 'transfer') && miles > 50
    const ratePerMile = isOver50 ? 1.75 : 2.75
    const distanceCents = Math.round(miles * ratePerMile * 100)
    note(`${miles} mi @ $${ratePerMile.toFixed(2)}/mi`, distanceCents)
    if (svc === 'airportdropoff' || svc === 'airportpickup') {
      if (isCmh) note('CMH airport fee', 450)
    }
    if (baseCents < MIN_FARE_CENTS) {
      const adj = MIN_FARE_CENTS - baseCents
      note('Minimum fare adjustment ($50 floor)', adj)
    }
  } else if (svc === 'hourlyevent' || svc === 'event' || svc === 'hourlyservice') {
    if (!Number.isFinite(hours) || hours < 2) {
      return { ok: false, error: 'minimum_hours', detail: 'Hourly/Event service is 2-hour minimum at $50/hr.' }
    }
    note(`${hours} hr @ $50/hr (2hr min)`, Math.round(hours * 50 * 100))
  } else if (svc === 'independentliving' || svc === 'independent') {
    const h = Math.max(1, Math.floor(hours || 1))
    if (h >= 1) note('Hour 1', 3500)
    if (h >= 2) note('Hour 2', 1500)
    if (h > 2) note(`Hours 3-${h} @ $50/hr`, (h - 2) * 5000)
  } else {
    return { ok: false, error: 'unknown_service', detail: `service_type "${args.service_type}" not recognized.` }
  }

  const surchargeCents = Math.round(baseCents * surchargeRate)
  if (surchargeCents > 0) {
    const pct = Math.round(surchargeRate * 100)
    note(`Late-night/early-morning surcharge (+${pct}%)`, surchargeCents)
  }
  const subtotalCents = baseCents
  const taxCents = taxRate != null ? Math.round(subtotalCents * taxRate) : 0
  if (taxRate != null) {
    const pct = (taxRate * 100).toFixed(2)
    note(`${originCounty} County sales tax (${pct}%)`, taxCents)
  }
  const totalCents = subtotalCents + taxCents
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`

  return {
    ok: true,
    total_dollars: Math.round(totalCents) / 100,
    subtotal_dollars: Math.round(subtotalCents) / 100,
    tax_dollars: Math.round(taxCents) / 100,
    county_tax_rate: taxRate,
    surcharge_rate: surchargeRate,
    used_county: originCounty || null,
    lines: lines.map((l) => ({ label: l.label, amount: fmt(l.cents) })),
    spoken_summary: `${fmt(totalCents)} total${surchargeRate > 0 ? ` including the +${Math.round(surchargeRate * 100)}% time surcharge` : ''}${taxRate != null ? ` and ${originCounty} County tax` : ''}.`,
  }
}

/**
 * Shared helper: text the business owner a dispatch summary (SmartRide
 * "right now" flow). Returns success/failure so the caller can craft
 * its response.
 */
export async function sendDispatchRequest(args: {
  businessId: string
  customerName: string
  customerPhone: string
  pickup: string
  dropoff?: string
  partySize?: number
  requestedTime: string
  email?: string
  flightNumber?: string
  airline?: string
  notes?: string
  retellCallId?: string | null
}): Promise<{ ok: true; ownerPhone: string } | { ok: false; error: string; detail?: string }> {
  const { supabaseAdmin } = await import('./supabase')
  const { telnyxClient } = await import('./telnyx')

  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!fromNumber) return { ok: false, error: 'no_sender_configured' }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('business_name, notifications_phone, notification_phone, escalation_phone')
    .eq('id', args.businessId)
    .maybeSingle()
  if (!biz) return { ok: false, error: 'business_not_found' }

  const ownerPhone = (biz as any).notifications_phone
    || (biz as any).notification_phone
    || (biz as any).escalation_phone
  if (!ownerPhone) return { ok: false, error: 'no_owner_phone' }

  // Idempotency guard. The agent (voice or SMS) sometimes re-fires
  // send_dispatch_request when the customer adds details AFTER an initial
  // dispatch (party size, email, "actually make it 8am") - which blasted the
  // owner with duplicate texts for the same ride (Robin Sorrentino got 4).
  // Dedupe on the stable trip identity: customer phone + pickup + dropoff +
  // requested time. The two legs of a round trip differ on pickup/dropoff/time
  // so they still send; only a re-fire of the SAME leg is suppressed. Party
  // size / notes deliberately excluded from the key so "same ride, now with
  // passenger count" is caught as the duplicate it is.
  const norm = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const custDigits = (args.customerPhone || '').replace(/\D/g, '')
  try {
    const sinceIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabaseAdmin
      .from('dispatch_notifications')
      .select('body, created_at')
      .eq('business_id', args.businessId)
      .eq('recipient_phone', ownerPhone)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(25)
    const dup = (recent || []).some((r: any) => {
      const raw = String(r.body || '')
      const b = norm(raw)
      const phoneHit = custDigits.length >= 7 && raw.replace(/\D/g, '').includes(custDigits)
      const pickupHit = b.includes('pickup: ' + norm(args.pickup))
      const dropHit = !args.dropoff || b.includes('dropoff: ' + norm(args.dropoff))
      if (!(phoneHit && pickupHit && dropHit)) return false
      // Duplicate only when the exact requested time matches (same ride re-fired).
      const whenHit = b.includes('when: ' + norm(args.requestedTime))
      return whenHit
    })
    if (dup) {
      logger.info('sendDispatchRequest deduped - identical trip already dispatched within 6h', {
        businessId: args.businessId,
      })
      return { ok: true, ownerPhone }
    }
  } catch (e) {
    // Dedupe is best-effort - never block a real dispatch because the lookup failed.
    logger.warn('dispatch dedupe check failed - sending anyway', { error: e instanceof Error ? e.message : 'unknown' })
  }

  const businessName = (biz as any).business_name || 'CloudGreet'
  const lines = [
    `${businessName} dispatch request:`,
    `${args.customerName} (${args.customerPhone})`,
    `Pickup: ${args.pickup}`,
  ]
  if (args.dropoff) lines.push(`Dropoff: ${args.dropoff}`)
  if (typeof args.partySize === 'number' && args.partySize > 0) lines.push(`Party: ${args.partySize}`)
  lines.push(`When: ${args.requestedTime}`)
  if (args.email) lines.push(`Email: ${args.email}`)
  if (args.flightNumber) lines.push(`Flight: ${args.airline ? `${args.airline} ` : ''}${args.flightNumber}`)
  if (args.notes) lines.push(`Notes: ${args.notes}`)
  lines.push('Call or text them back to accept.')

  const body = lines.join('\n')
  try {
    const sent = await telnyxClient.sendSMS(ownerPhone, body, fromNumber)
    void import('./dispatch-tracking').then(({ recordDispatchSend }) =>
      recordDispatchSend({
        businessId: args.businessId,
        retellCallId: args.retellCallId ?? null,
        recipientPhone: ownerPhone,
        fromNumber,
        body,
        telnyxMessageId: (sent as any)?.data?.id || null,
      }),
    ).catch(() => { /* tracking is best-effort */ })
    // Send admin the same dispatch text as the owner (not a report-link summary).
    // Gated on admin !== owner so testing against your own number doesn't double-send.
    const adminPhone = (process.env.CLOUDGREET_ADMIN_NOTIFY_PHONE || '+17372960092').trim()
    if (adminPhone && adminPhone.replace(/\D/g, '') !== ownerPhone.replace(/\D/g, '')) {
      void (async () => {
        try {
          const adminSent = await telnyxClient.sendSMS(adminPhone, body, fromNumber)
          void import('./dispatch-tracking').then(({ recordDispatchSend }) =>
            recordDispatchSend({
              businessId: args.businessId,
              retellCallId: args.retellCallId ?? null,
              recipientPhone: adminPhone,
              fromNumber,
              body,
              telnyxMessageId: (adminSent as any)?.data?.id || null,
            }),
          ).catch(() => {})
        } catch (e) {
          logger.warn('sendDispatchRequest: admin copy failed', { error: e instanceof Error ? e.message : 'unknown' })
        }
      })()
    }
    return { ok: true, ownerPhone }
  } catch (e) {
    return { ok: false, error: 'sms_send_failed', detail: e instanceof Error ? e.message : 'unknown' }
  }
}
