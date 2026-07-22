import { discoverPlaces, txCityCoords, TX_CITY_COORDS, getPlacesCallCount, PLACES_COST_PER_CALL } from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import { resolveUsMetro, resolveUsState, NATIONAL_FANOUT } from './us-metros'
import { detectReservationPlatform } from './reservation-platform'
import { logger } from '../monitoring'
import type { ScrapeParams, ScrapeRecord, SeenSets, SourceDefinition, SourceRunOpts } from './types'

/**
 * Google Places direct discovery for trades that don't have a Texas
 * licensing database. Same fan-out + dedupe contract as
 * google-places-discovery.ts: when the rep doesn't pick a specific
 * city we walk the major TX metros until we satisfy `limit`, skipping
 * anything in opts.seen so we don't re-yield already-imported leads.
 */

type TradeId = 'roofing' | 'painting' | 'handyman' | 'landscaping' | 'locksmith' | 'restaurant'

const TRADES: Record<TradeId, {
 trade: SourceDefinition['trade']
 label: string
 description: string
 query: string
 /** Optional Google Place type to hard-filter results (e.g. 'locksmith',
  *  'restaurant'). Sharpens categories that a free-text query alone
  *  returns adjacent businesses for. */
 includedType?: string
}> = {
 roofing: {
  trade: 'Roofing',
  label: 'Google · Roofing',
  description:
   'Roofing contractors via Google Places. Type any US city, or leave blank to fan out across top US metros nationwide.',
  query: 'roofing contractors',
 },
 painting: {
  trade: 'Painting',
  label: 'Google · Painting',
  description: 'Painting contractors via Google Places. Type any US city or leave blank to fan out nationwide.',
  query: 'painting contractors',
 },
 handyman: {
  trade: 'Handyman',
  label: 'Google · Handyman',
  description: 'Handyman / general repair services via Google Places. Any US city or nationwide.',
  query: 'handyman services',
 },
 landscaping: {
  trade: 'Landscaping',
  label: 'Google · Landscaping',
  description: 'Landscaping / lawn care via Google Places. Any US city or nationwide.',
  query: 'landscaping companies',
 },
 locksmith: {
  trade: 'Locksmith',
  label: 'Google · Locksmith',
  description: 'Locksmiths via Google Places. Any US city or leave blank to fan out nationwide. The review filter weeds out lead-gen spam pins.',
  query: 'locksmith',
  includedType: 'locksmith',
 },
 restaurant: {
  trade: 'Restaurant',
  label: 'Google · Restaurant',
  description: 'Restaurants via Google Places. Any US city or leave blank to fan out nationwide.',
  query: 'restaurant',
  includedType: 'restaurant',
 },
}

const TX_FANOUT_CITIES = [
 'houston', 'san antonio', 'dallas', 'fort worth', 'austin',
 'el paso', 'arlington', 'plano', 'corpus christi', 'lubbock',
 'laredo', 'garland', 'irving', 'frisco', 'amarillo',
 'mckinney', 'mesquite', 'killeen', 'waco', 'denton',
 'midland', 'abilene', 'beaumont', 'round rock', 'tyler',
 'college station', 'pearland', 'sugar land', 'lewisville',
 'longview', 'cedar park', 'conroe', 'georgetown', 'san marcos',
 'pflugerville', 'new braunfels',
]

function isSpecificCity(raw: string): boolean {
 if (!raw) return false
 const cleaned = raw.trim().toLowerCase().replace(/\s*,?\s*(tx|texas)\s*$/i, '').trim()
 if (!cleaned) return false
 if (cleaned === 'tx' || cleaned === 'texas') return false
 return !!TX_CITY_COORDS[cleaned]
}

function buildSource(id: TradeId): SourceDefinition {
 const meta = TRADES[id]
 return {
  id: `google_${id}`,
  label: meta.label,
  description: meta.description,
  trade: meta.trade,
  run: async function* (params: ScrapeParams, opts: SourceRunOpts) {
   const limit = Math.max(1, Math.min(2000, params.limit ?? 100))
   const cityRaw = (params.location || '').trim()
   const radiusMiles =
    typeof params.extra?.radiusMiles === 'number' ? params.extra.radiusMiles as number : 30
   const radiusMeters = Math.round(radiusMiles * 1609.34)
   const diag = opts.diag
   const qualityLevel = (params.extra?.quality as 'loose' | 'standard' | 'strict' | undefined) || 'standard'
   const minReviewCount =
    typeof params.extra?.minReviewCount === 'number'
     ? params.extra.minReviewCount as number
     : qualityLevel === 'strict' ? 20 : qualityLevel === 'loose' ? 0 : 3
   const minRating =
    typeof params.extra?.minRating === 'number'
     ? params.extra.minRating as number
     : qualityLevel === 'strict' ? 4.0 : qualityLevel === 'loose' ? 0 : 3.5
   // Upper bounds (from the rep's rating/reviews range sliders). Undefined =
   // no ceiling. maxRating lets a rep target "below par" businesses that
   // struggle on call intake; maxReviewCount skips big staffed shops.
   const maxRating =
    typeof params.extra?.maxRating === 'number' ? params.extra.maxRating as number : undefined
   const maxReviewCount =
    typeof params.extra?.maxReviewCount === 'number' ? params.extra.maxReviewCount as number : undefined
   const requireWebsite = qualityLevel === 'strict'
   // Restaurant-only: filter to leads whose website uses a given reservation
   // platform (e.g. 'sevenrooms', which exposes a booking API). Requires a
   // website and a per-lead site fetch, so it's slower and we scan more
   // restaurants to net the same count. Ignored for non-restaurant trades.
   const wantPlatform = id === 'restaurant'
    ? (typeof params.extra?.reservationPlatform === 'string'
       ? (params.extra.reservationPlatform as string).toLowerCase()
       : undefined)
    : undefined
   diag?.push(`google-trades start: city=${cityRaw || '(fanout)'} rating=${minRating}-${maxRating ?? '5'} reviews=${minReviewCount}-${maxReviewCount ?? 'inf'}${wantPlatform ? ` reservationPlatform=${wantPlatform}` : ''}`)

   // Four-tier resolution:
   //   1. specific TX city -> just that city (existing behavior)
   //   2. specific non-TX US metro (resolveUsMetro hits) -> just that metro
   //   3. bare state name / abbrev ("michigan" / "MI") -> all metros in
   //      that state. Without this, "michigan" fell through to the
   //      NATIONAL_FANOUT which leads with NYC / LA / Chicago, so reps
   //      typing a state got results from the wrong state entirely.
   //   4. blank or unrecognized -> national fan-out across top US metros
   type Target = { name: string; state: string; lat: number; lng: number }
   let targets: Target[] = []
   if (isSpecificCity(cityRaw)) {
    const center = txCityCoords(cityRaw)!
    targets = [{ name: cityRaw, state: 'TX', lat: center.lat, lng: center.lng }]
   } else {
    const us = resolveUsMetro(cityRaw)
    if (us) {
     targets = [us]
    } else {
     const stateMetros = resolveUsState(cityRaw)
     if (stateMetros.length > 0) {
      targets = stateMetros
     } else {
      targets = NATIONAL_FANOUT
     }
    }
   }
   const seen = opts.seen
   const localPhones = new Set<string>()
   const localPlaceIds = new Set<string>()

   let totalYielded = 0
   let totalDropped = 0
   let detectChecks = 0
   const placesCallsAtStart = getPlacesCallCount()

   // Reservation-platform detection (SevenRooms filter) is a website fetch
   // per candidate. Done one-at-a-time across a nationwide fan-out it times
   // the request out, so we check sites in PARALLEL batches and stop after a
   // hard budget of total checks (returning what we found). Tunable via env.
   const DETECT_CONCURRENCY = 10
   const DETECT_BUDGET = Number(process.env.SCRAPER_DETECT_BUDGET || '160')
   const DETECT_TIMEOUT_MS = 4000

   type Candidate = { place: any; phone: string; website: string }
   const buildRecord = (place: any, phone: string, targetState: string, fanoutCity: string, platform: string | null): ScrapeRecord => ({
    source: `google_${id}`,
    business_name: place.business_name,
    owner_name: null,
    phone,
    website: place.website,
    business_type: meta.trade,
    address: place.address,
    city: place.city,
    state: place.state || targetState,
    zip: place.zip,
    raw: {
     google_place_id: place.place_id,
     google_types: place.google_types,
     google_rating: place.rating,
     google_review_count: place.review_count,
     google_business_status: place.business_status,
     fanout_city: fanoutCity,
     query: meta.query,
     ...(platform ? { reservation_platform: platform } : {}),
    },
   })
   // Check a batch of candidate websites concurrently; returns the matched
   // platform (or null) per candidate, respecting the detection budget.
   const detectBatch = (batch: Candidate[]): Promise<(string | null)[]> =>
    Promise.all(batch.map(async (b) => {
     if (detectChecks >= DETECT_BUDGET) return null
     detectChecks++
     const p = await detectReservationPlatform(b.website, { timeoutMs: DETECT_TIMEOUT_MS, signal: opts.signal })
     return p === wantPlatform ? p : null
    }))

   for (const target of targets) {
    if (totalYielded >= limit) break
    if (wantPlatform && detectChecks >= DETECT_BUDGET) break
    const remaining = limit - totalYielded
    const askPerCity = Math.min(60, Math.max(20, remaining * 3))
    const city = target.name

    let cityYielded = 0
    let cityDropped = 0
    // Filtered mode buffers deduped candidates here, then verifies their
    // websites in parallel batches instead of blocking on each one.
    let pending: Candidate[] = []

    for await (const place of discoverPlaces(`${meta.query} near ${city} ${target.state}`, {
     maxResults: askPerCity,
     minReviewCount,
     maxReviewCount,
     minRating,
     maxRating,
     includedType: meta.includedType,
     stateAllowList: [target.state],
     locationRestriction: { lat: target.lat, lng: target.lng, radiusMeters },
     onDiag: (m) => diag?.push(m),
    })) {
     if (totalYielded >= limit) break
     if (cityYielded >= remaining) break
     if (wantPlatform && detectChecks >= DETECT_BUDGET) break

     const phone = normalizePhone(place.phone)
     if (!phone) { cityDropped++; totalDropped++; continue }

     const website = normalizeWebsite(place.website)
     if (requireWebsite && !website) { cityDropped++; totalDropped++; continue }
     const placeId = place.place_id || ''
     const nameKey = businessNameKey(place.business_name, place.city)

     if (seen) {
      if (seen.phones.has(phone)) { cityDropped++; totalDropped++; continue }
      if (placeId && seen.placeIds.has(placeId)) { cityDropped++; totalDropped++; continue }
      if (website && seen.websites.has(website)) { cityDropped++; totalDropped++; continue }
      if (nameKey && seen.nameKeys.has(nameKey)) { cityDropped++; totalDropped++; continue }
     }
     if (localPhones.has(phone)) { cityDropped++; totalDropped++; continue }
     if (placeId && localPlaceIds.has(placeId)) { cityDropped++; totalDropped++; continue }

     localPhones.add(phone)
     if (placeId) localPlaceIds.add(placeId)

     // Unfiltered: yield straight through (no site fetch).
     if (!wantPlatform) {
      yield buildRecord(place, phone, target.state, city, null)
      cityYielded++; totalYielded++
      continue
     }

     // Filtered: need a website to verify the platform; buffer for the batch.
     if (!website) { cityDropped++; totalDropped++; continue }
     pending.push({ place, phone, website: place.website || website })
     if (pending.length >= DETECT_CONCURRENCY) {
      const batch = pending; pending = []
      const verdicts = await detectBatch(batch)
      for (let k = 0; k < batch.length; k++) {
       if (totalYielded >= limit) break
       if (verdicts[k]) { yield buildRecord(batch[k].place, batch[k].phone, target.state, city, verdicts[k]); cityYielded++; totalYielded++ }
       else { cityDropped++; totalDropped++ }
      }
     }
    }

    // Flush the last partial batch for this city.
    if (wantPlatform && pending.length > 0 && totalYielded < limit) {
     const batch = pending; pending = []
     const verdicts = await detectBatch(batch)
     for (let k = 0; k < batch.length; k++) {
      if (totalYielded >= limit) break
      if (verdicts[k]) { yield buildRecord(batch[k].place, batch[k].phone, target.state, city, verdicts[k]); cityYielded++; totalYielded++ }
      else { cityDropped++; totalDropped++ }
     }
    }

    if (cityYielded > 0 || cityDropped > 0) {
     logger.info('google-trades city pass', {
      source: `google_${id}`, city, kept: cityYielded, dropped: cityDropped,
     })
    }
    diag?.push(`${city}/${id}: kept=${cityYielded} dropped=${cityDropped}`)
    if (targets.length === 1) break
   }

   if (wantPlatform && detectChecks >= DETECT_BUDGET && totalYielded < limit) {
    diag?.push(`Checked ${detectChecks} restaurant sites for ${wantPlatform} (scan cap). Run again to keep going - already-seen spots are skipped.`)
   }

   // Per-run Places spend so a scrape never surprises us on the bill. The
   // reservation-platform site checks (SevenRooms filter) are free web
   // requests and cost nothing here - only these Places calls do.
   // ADMIN-ONLY: log it (server logs / admin), do NOT push to `diag` - diag
   // gets dumped into scrape_jobs.error and shown to reps on empty runs, and
   // reps shouldn't see API cost.
   const placesCalls = getPlacesCallCount() - placesCallsAtStart
   const estCost = placesCalls * PLACES_COST_PER_CALL
   logger.info('google-trades run cost', {
    source: `google_${id}`, kept: totalYielded, dropped: totalDropped,
    placesCalls, estCostUsd: Number(estCost.toFixed(2)), wantPlatform: wantPlatform || null,
   })
  },
 }
}

export const googleRoofing = buildSource('roofing')
export const googlePainting = buildSource('painting')
export const googleHandyman = buildSource('handyman')
export const googleLandscaping = buildSource('landscaping')
export const googleLocksmith = buildSource('locksmith')
export const googleRestaurant = buildSource('restaurant')

/**
 * Restaurants that use SevenRooms for reservations. Same discovery as the
 * plain restaurant source, but every candidate's website is checked for a
 * SevenRooms footprint and only matches are kept. These are the leads where
 * the AI can book tables directly (SevenRooms has a real booking API), so
 * they're worth targeting over OpenTable/Resy/Tock restaurants where we can
 * only deflect to a link. Slower than the plain source (a site fetch per
 * candidate) and it scans more restaurants to net the same count.
 */
export const googleRestaurantSevenRooms: SourceDefinition = {
 id: 'google_restaurant_sevenrooms',
 label: 'Google · Restaurant (SevenRooms)',
 description:
  'Restaurants using SevenRooms for reservations (the AI can book tables directly via their API). Any US city or leave blank to fan out nationwide. Slower - we check each restaurant\'s website for the SevenRooms widget and keep only matches.',
 trade: 'Restaurant',
 run: (params: ScrapeParams, opts: SourceRunOpts) =>
  googleRestaurant.run(
   { ...params, extra: { ...(params.extra || {}), reservationPlatform: 'sevenrooms' } },
   opts,
  ),
}
