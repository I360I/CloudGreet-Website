import { discoverPlaces, txCityCoords, TX_CITY_COORDS } from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import { logger } from '../monitoring'
import type { ScrapeParams, ScrapeRecord, SeenSets, SourceDefinition, SourceRunOpts } from './types'

/**
 * Google Places direct discovery for trades that don't have a Texas
 * licensing database. Same fan-out + dedupe contract as
 * google-places-discovery.ts: when the rep doesn't pick a specific
 * city we walk the major TX metros until we satisfy `limit`, skipping
 * anything in opts.seen so we don't re-yield already-imported leads.
 */

type TradeId = 'roofing' | 'painting' | 'handyman' | 'landscaping'

const TRADES: Record<TradeId, {
 trade: SourceDefinition['trade']
 label: string
 description: string
 query: string
}> = {
 roofing: {
  trade: 'Roofing',
  label: 'Google · Roofing',
  description:
   'Direct Google Places discovery for roofing contractors. Texas doesn\'t license roofers, so this is the cleanest free path.',
  query: 'roofing contractors',
 },
 painting: {
  trade: 'Painting',
  label: 'Google · Painting',
  description: 'Direct Google Places discovery for painting contractors.',
  query: 'painting contractors',
 },
 handyman: {
  trade: 'Handyman',
  label: 'Google · Handyman',
  description: 'Direct Google Places discovery for handyman / general repair services.',
  query: 'handyman services',
 },
 landscaping: {
  trade: 'Landscaping',
  label: 'Google · Landscaping',
  description: 'Direct Google Places discovery for landscaping / lawn care.',
  query: 'landscaping companies',
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
   const minReviewCount =
    typeof params.extra?.minReviewCount === 'number' ? params.extra.minReviewCount as number : 0
   const minRating =
    typeof params.extra?.minRating === 'number' ? params.extra.minRating as number : 0

   const cityList = isSpecificCity(cityRaw) ? [cityRaw] : TX_FANOUT_CITIES
   const seen = opts.seen
   const localPhones = new Set<string>()
   const localPlaceIds = new Set<string>()

   let totalYielded = 0
   let totalDropped = 0

   for (const city of cityList) {
    if (totalYielded >= limit) break
    const center = txCityCoords(city)
    if (!center) continue
    const remaining = limit - totalYielded
    const askPerCity = Math.min(60, Math.max(20, remaining * 3))

    let cityYielded = 0
    let cityDropped = 0

    for await (const place of discoverPlaces(`${meta.query} near ${city} TX`, {
     maxResults: askPerCity,
     minReviewCount,
     minRating,
     locationRestriction: { lat: center.lat, lng: center.lng, radiusMeters },
    })) {
     if (totalYielded >= limit) break
     if (cityYielded >= remaining) break

     const phone = normalizePhone(place.phone)
     if (!phone) { cityDropped++; totalDropped++; continue }

     const website = normalizeWebsite(place.website)
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
      state: place.state || 'TX',
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
    if (cityList.length === 1) break
   }
  },
 }
}

export const googleRoofing = buildSource('roofing')
export const googlePainting = buildSource('painting')
export const googleHandyman = buildSource('handyman')
export const googleLandscaping = buildSource('landscaping')
