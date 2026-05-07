/**
 * Standalone Law-firm source.
 *
 * Targets solo and small-firm lawyers - the AI receptionist's natural
 * customer for the legal vertical. Unlike contractors, the licensing
 * data is fragmented per-state (each bar association has its own
 * search) so we go Google Places-only.
 *
 * Filters layered on top of the base Quality-Mode-style sweep:
 *   - Type: lawyer (or specific subtype text query)
 *   - Reviews: 5-200 inclusive (cuts national mills + ghost listings)
 *   - Has website + has phone
 *   - Name blocklist for known branded chains
 *
 * Optional `extra.lawType` lets the rep narrow to a sub-vertical:
 *   'personal_injury' | 'family' | 'criminal' | 'estate' | 'business'
 *   | 'immigration' | 'general' (default)
 */

import { logger } from '../monitoring'
import { discoverPlaces, isGooglePlacesConfigured, txCityCoords } from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import type { ScrapeParams, ScrapeRecord, SourceDefinition, SourceRunOpts } from './types'

const MAX_REVIEWS = 200
const MIN_REVIEWS = 5

const NAME_BLOCKLIST = [
  'morgan & morgan', 'jacoby & meyers', 'cellino', 'parker waichman',
  'lerner', 'sokolove', 'simmons hanly', 'weitz', 'baron & budd',
  'kirkland & ellis', 'latham & watkins', 'jones day', 'sidley',
  'skadden', 'baker mckenzie', 'dla piper', 'norton rose',
  'pope mcglamry', 'goldberg segalla',
]

const LAW_TYPE_QUERIES: Record<string, string> = {
  general:         'law firm',
  personal_injury: 'personal injury lawyer',
  family:          'family lawyer divorce attorney',
  criminal:        'criminal defense lawyer',
  estate:          'estate planning lawyer',
  business:        'business lawyer attorney',
  immigration:     'immigration lawyer',
}

/**
 * Same TX metro fan-out the contractor sources use. Lawyers are dense
 * in TX so the existing metro list works well as a default; reps can
 * still type a specific city.
 */
const TX_FANOUT_CITIES = [
  'houston', 'san antonio', 'dallas', 'fort worth', 'austin',
  'el paso', 'arlington', 'plano', 'corpus christi', 'lubbock',
  'mckinney', 'frisco', 'killeen', 'waco', 'denton',
  'midland', 'beaumont', 'tyler',
]

async function* runLaw(
  params: ScrapeParams,
  opts: SourceRunOpts,
): AsyncGenerator<ScrapeRecord, void, void> {
  if (!isGooglePlacesConfigured()) {
    logger.warn('places law skipped - GOOGLE_PLACES_API_KEY missing')
    return
  }

  const limit = Math.max(1, Math.min(500, params.limit ?? 50))
  const lawType = String(params.extra?.lawType || 'general')
  const textQuery = LAW_TYPE_QUERIES[lawType] || LAW_TYPE_QUERIES.general
  const cityRaw = (params.location || '').trim().toLowerCase()
    .replace(/\s*,?\s*(tx|texas)\s*$/i, '').trim()

  const cityList = cityRaw && txCityCoords(cityRaw) ? [cityRaw] : TX_FANOUT_CITIES
  const seen = opts.seen
  const localPhones = new Set<string>()
  const localPlaceIds = new Set<string>()

  let totalYielded = 0
  let totalDropped = 0

  for (const city of cityList) {
    if (totalYielded >= limit) break
    const center = txCityCoords(city)
    if (!center) continue
    const query = `${textQuery} near ${city} TX`
    const remaining = limit - totalYielded

    for await (const place of discoverPlaces(query, {
      maxResults: Math.min(60, Math.max(20, remaining * 3)),
      includedType: 'lawyer',
      minReviewCount: MIN_REVIEWS,
      minRating: 4.0,
      excludeClosed: true,
      locationRestriction: {
        lat: center.lat, lng: center.lng, radiusMeters: 40_000,
      },
    })) {
      if (totalYielded >= limit) break

      // Drop mega-firms by review count.
      if ((place.review_count ?? 0) > MAX_REVIEWS) { totalDropped++; continue }
      // Drop branded chains by name.
      const lowerName = (place.business_name || '').toLowerCase()
      if (NAME_BLOCKLIST.some((n) => lowerName.includes(n))) { totalDropped++; continue }

      const phone = normalizePhone(place.phone)
      if (!phone) { totalDropped++; continue }
      const website = normalizeWebsite(place.website)
      if (!website) { totalDropped++; continue }

      const placeId = place.place_id || ''
      const nameKey = businessNameKey(place.business_name, place.city)

      if (seen) {
        if (seen.phones.has(phone)) { totalDropped++; continue }
        if (placeId && seen.placeIds.has(placeId)) { totalDropped++; continue }
        if (website && seen.websites.has(website)) { totalDropped++; continue }
        if (nameKey && seen.nameKeys.has(nameKey)) { totalDropped++; continue }
      }
      if (localPhones.has(phone)) { totalDropped++; continue }
      if (placeId && localPlaceIds.has(placeId)) { totalDropped++; continue }
      localPhones.add(phone)
      if (placeId) localPlaceIds.add(placeId)

      yield {
        source: 'places_law',
        business_name: place.business_name,
        owner_name: null,
        business_type: 'Law',
        phone,
        website: place.website,
        address: place.address,
        city: place.city,
        state: place.state,
        zip: place.zip,
        raw: {
          google_place_id: place.place_id,
          google_types: place.google_types,
          google_rating: place.rating,
          google_review_count: place.review_count,
          google_business_status: place.business_status,
          law_type: lawType,
          fanout_city: city,
        },
      }
      totalYielded++
    }
    if (cityList.length === 1) break
  }

  if (totalDropped > 0) {
    logger.info('places law filter', {
      kept: totalYielded, dropped: totalDropped,
      cities_scanned: cityList.length, lawType,
    })
  }
}

export const placesLaw: SourceDefinition = {
  id: 'places_law',
  label: 'Solo & small law firms',
  description: 'Solo and small-firm lawyers across Texas - the kind of practice that misses calls because they\'re in court. Filters out national mega-firms (Morgan & Morgan, etc) and giant corporate law shops by review count and name. Optional law-type filter via the extras.',
  trade: 'Law',
  run: runLaw,
}
