import { discoverPlaces, txCityCoords, TX_CITY_COORDS } from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import { resolveUsMetro, resolveUsState, NATIONAL_FANOUT } from './us-metros'
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
   const requireWebsite = qualityLevel === 'strict'
   diag?.push(`google-trades start: city=${cityRaw || '(fanout)'} strictness=${qualityLevel} minRating=${minRating} minReviews=${minReviewCount}`)

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

   for (const target of targets) {
    if (totalYielded >= limit) break
    const remaining = limit - totalYielded
    const askPerCity = Math.min(60, Math.max(20, remaining * 3))
    const city = target.name

    let cityYielded = 0
    let cityDropped = 0

    for await (const place of discoverPlaces(`${meta.query} near ${city} ${target.state}`, {
     maxResults: askPerCity,
     minReviewCount,
     minRating,
     includedType: meta.includedType,
     stateAllowList: [target.state],
     locationRestriction: { lat: target.lat, lng: target.lng, radiusMeters },
     onDiag: (m) => diag?.push(m),
    })) {
     if (totalYielded >= limit) break
     if (cityYielded >= remaining) break

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

     const record: ScrapeRecord = {
      source: `google_${id}`,
      business_name: place.business_name,
      owner_name: null,
      phone,
      website: place.website,
      business_type: meta.trade,
      address: place.address,
      city: place.city,
      state: place.state || target.state,
      zip: place.zip,
      raw: {
       google_place_id: place.place_id,
       google_types: place.google_types,
       google_rating: place.rating,
       google_review_count: place.review_count,
       google_business_status: place.business_status,
       fanout_city: city,
       query: meta.query,
      },
     }
     yield record
     cityYielded++
     totalYielded++
    }

    if (cityYielded > 0 || cityDropped > 0) {
     logger.info('google-trades city pass', {
      source: `google_${id}`, city, kept: cityYielded, dropped: cityDropped,
     })
    }
    diag?.push(`${city}/${id}: kept=${cityYielded} dropped=${cityDropped}`)
    if (targets.length === 1) break
   }
  },
 }
}

export const googleRoofing = buildSource('roofing')
export const googlePainting = buildSource('painting')
export const googleHandyman = buildSource('handyman')
export const googleLandscaping = buildSource('landscaping')
export const googleLocksmith = buildSource('locksmith')
export const googleRestaurant = buildSource('restaurant')
