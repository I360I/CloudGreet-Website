/**
 * Google Places-backed discovery sources.
 *
 * Unlike the licensing databases (TDLR, TDA, TSBPE), Google Places
 * returns actual *businesses* - type-classified, with phone, website,
 * address, rating, and review count in one call. This is the highest-
 * precision source: results that survive the rating + review filters
 * are real, contactable HVAC / plumbing / etc. shops.
 *
 * For each trade we query a free-text term + Google's `includedType`
 * to bias results to the right vertical, location-bias around the
 * requested city's center (or Texas rectangle if the city isn't in
 * our coord map), and require ≥3 reviews to skip ghost listings.
 */

import { logger } from '../monitoring'
import {
  discoverPlaces,
  txCityCoords,
  TX_CITY_COORDS,
  isGooglePlacesConfigured,
  type PlaceDiscoveryResult,
} from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import type { ScrapeParams, ScrapeRecord, SeenSets, SourceDefinition, SourceRunOpts } from './types'

type TradeKey = 'HVAC' | 'Electrical' | 'Plumbing' | 'Pest Control' | 'Roofing' | 'Painting' | 'Handyman' | 'Landscaping'

type TradeConfig = {
  /** Source id used in the registry / scrape_results.source column. */
  id: string
  label: string
  description: string
  /** Trade tag persisted on records. */
  trade: TradeKey
  /** Google `includedType` - see https://developers.google.com/maps/documentation/places/web-service/place-types */
  includedType: string
  /** Free-text query layered on top of the type. Helps when type is broad. */
  textQuery: string
}

const TRADES: TradeConfig[] = [
  {
    id: 'places_hvac',
    label: 'Google · HVAC contractors',
    description: 'Google Places businesses tagged as HVAC contractors. Higher signal than license databases - only real listings with reviews and a phone show up.',
    trade: 'HVAC',
    includedType: 'hvac_contractor',
    textQuery: 'hvac contractors',
  },
  {
    id: 'places_plumbing',
    label: 'Google · Plumbers',
    description: 'Google Places businesses tagged as plumbers, with reviews and a phone.',
    trade: 'Plumbing',
    includedType: 'plumber',
    textQuery: 'plumbing contractors',
  },
  {
    id: 'places_electrical',
    label: 'Google · Electricians',
    description: 'Google Places businesses tagged as electricians, with reviews and a phone.',
    trade: 'Electrical',
    includedType: 'electrician',
    textQuery: 'electrical contractors',
  },
  {
    id: 'places_roofing',
    label: 'Google · Roofers',
    description: 'Google Places roofing contractors, with reviews and a phone.',
    trade: 'Roofing',
    includedType: 'roofing_contractor',
    textQuery: 'roofing contractors',
  },
  {
    id: 'places_pest',
    label: 'Google · Pest control',
    description: 'Google Places pest-control services, with reviews and a phone.',
    trade: 'Pest Control',
    includedType: 'pest_control_service',
    textQuery: 'pest control',
  },
  {
    id: 'places_painting',
    label: 'Google · Painters',
    description: 'Google Places painting contractors, with reviews and a phone.',
    trade: 'Painting',
    includedType: 'painter',
    textQuery: 'painting contractors',
  },
  {
    id: 'places_landscaping',
    label: 'Google · Landscaping',
    description: 'Google Places landscaping companies, with reviews and a phone.',
    trade: 'Landscaping',
    includedType: 'landscaping_service',
    textQuery: 'landscaping companies',
  },
]

/**
 * Top TX metros, ordered by population. When the rep doesn't pick a
 * specific city (or types something like "Texas" / "TX" / leaves it
 * empty), we fan out across these in order, peeling 60 fresh places
 * per metro until the requested `limit` is satisfied.
 *
 * Population-ordered so even a small `limit` hits the densest pools
 * first - Houston, Dallas-Fort Worth, San Antonio, Austin together
 * cover most of the addressable HVAC / plumbing / electrical market
 * in the state.
 */
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

/** Returns true if the rep typed something that maps to a single city. */
function isSpecificCity(raw: string): boolean {
  if (!raw) return false
  const cleaned = raw.trim().toLowerCase().replace(/\s*,?\s*(tx|texas)\s*$/i, '').trim()
  if (!cleaned) return false
  if (cleaned === 'tx' || cleaned === 'texas') return false
  return !!TX_CITY_COORDS[cleaned]
}

async function* runPlaces(
  cfg: TradeConfig,
  params: ScrapeParams,
  opts: SourceRunOpts,
): AsyncGenerator<ScrapeRecord, void, void> {
  if (!isGooglePlacesConfigured()) {
    logger.warn('places discovery skipped - GOOGLE_PLACES_API_KEY missing')
    return
  }

  const cityRaw = (params.location || '').trim()
  const limit = Math.max(1, Math.min(2000, params.limit ?? 100))
  const minReviewCount =
    typeof params.extra?.minReviewCount === 'number' ? params.extra.minReviewCount as number : 3
  const radiusMiles =
    typeof params.extra?.radiusMiles === 'number' ? params.extra.radiusMiles as number : 30
  const radiusMeters = Math.round(radiusMiles * 1609.34)
  const minRating =
    typeof params.extra?.minRating === 'number' ? params.extra.minRating as number : 0

  // Fan-out plan: if the rep typed a real city, scrape only that city.
  // Otherwise (state-level or empty) walk every TX metro until we hit
  // `limit` fresh records. Without this, "Texas HVAC" returns the same
  // top-60 ranked across the whole state every run.
  const cityList = isSpecificCity(cityRaw) ? [cityRaw] : TX_FANOUT_CITIES

  const seen = opts.seen
  // Per-run dedupe across cities (independent of cross-run seen sets).
  const localPhones = new Set<string>()
  const localPlaceIds = new Set<string>()

  let totalYielded = 0
  let totalDropped = 0

  for (const city of cityList) {
    if (totalYielded >= limit) break
    const center = txCityCoords(city)
    if (!center) continue
    const query = `${cfg.textQuery} near ${city} TX`
    const remaining = limit - totalYielded

    let cityYielded = 0
    let cityDropped = 0

    // Ask for headroom so a city with high dupe rate still produces
    // some fresh results - text search caps at ~60 across pages, but
    // we cap our ask at 3x remaining so we stop paging early when we
    // have enough.
    const askPerCity = Math.min(60, Math.max(20, remaining * 3))

    for await (const place of discoverPlaces(query, {
      maxResults: askPerCity,
      includedType: cfg.includedType,
      minReviewCount,
      minRating,
      locationRestriction: { lat: center.lat, lng: center.lng, radiusMeters },
    })) {
      if (totalYielded >= limit) break
      if (cityYielded >= remaining) break

      // Trade sanity check - e.g. drop a 'general_contractor' that's not
      // really HVAC by name.
      if (!isPlaceOnTrade(place, cfg)) { cityDropped++; totalDropped++; continue }

      const phone = normalizePhone(place.phone)
      if (!phone) { cityDropped++; totalDropped++; continue } // can't cold-call without a phone

      const website = normalizeWebsite(place.website)
      const placeId = place.place_id || ''
      const nameKey = businessNameKey(place.business_name, place.city)

      // Skip dupes vs cross-run seen sets *inside* the source so we
      // keep paging instead of yielding then losing them downstream.
      if (seen) {
        if (seen.phones.has(phone)) { cityDropped++; totalDropped++; continue }
        if (placeId && seen.placeIds.has(placeId)) { cityDropped++; totalDropped++; continue }
        if (website && seen.websites.has(website)) { cityDropped++; totalDropped++; continue }
        if (nameKey && seen.nameKeys.has(nameKey)) { cityDropped++; totalDropped++; continue }
      }
      // Within-run dedupe across cities (e.g. an Austin business showing
      // up again on the Round Rock query).
      if (localPhones.has(phone)) { cityDropped++; totalDropped++; continue }
      if (placeId && localPlaceIds.has(placeId)) { cityDropped++; totalDropped++; continue }

      localPhones.add(phone)
      if (placeId) localPlaceIds.add(placeId)

      yield {
        source: cfg.id,
        business_name: place.business_name,
        owner_name: null,
        business_type: cfg.trade,
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
          fanout_city: city,
        },
      }
      cityYielded++
      totalYielded++
    }

    if (cityYielded > 0 || cityDropped > 0) {
      logger.info('places discovery city pass', {
        source: cfg.id, city, kept: cityYielded, dropped: cityDropped,
      })
    }
    // If a single specific city was requested, don't fan out.
    if (cityList.length === 1) break
  }

  if (totalDropped > 0) {
    logger.info('places discovery filter', {
      source: cfg.id, location: cityRaw || '(state-wide)',
      kept: totalYielded, dropped: totalDropped,
      cities_scanned: cityList.length,
    })
  }
}

const TRADE_KEYWORD_RE: Record<TradeKey, RegExp> = {
  HVAC:        /\b(HVAC|A\/?C|AIR|HEATING|COOLING|REFRIG|MECHANICAL|FURNACE|DUCT|CLIMATE)\b/i,
  Electrical:  /\b(ELECTRIC|ELECTRICAL|WIRING|LIGHTING|GENERATOR|SOLAR)\b/i,
  Plumbing:    /\b(PLUMB|DRAIN|SEWER|PIPE|LEAK|HYDRO|WATER)\b/i,
  'Pest Control': /\b(PEST|TERMITE|EXTERMIN|BUG|MOSQUITO|RODENT|WILDLIFE)\b/i,
  Roofing:     /\b(ROOF|SHINGLE|GUTTER)\b/i,
  Painting:    /\b(PAINT|COATING)\b/i,
  Handyman:    /\b(HANDY|REPAIR)\b/i,
  Landscaping: /\b(LANDSCAP|LAWN|TREE|YARD|GARDEN|HARDSCAPE)\b/i,
}

const TRADE_TYPE_ALIASES: Record<TradeKey, string[]> = {
  HVAC: ['hvac_contractor', 'air_conditioning_contractor', 'heating_contractor', 'general_contractor'],
  Electrical: ['electrician', 'electrical_contractor', 'general_contractor'],
  Plumbing: ['plumber', 'plumbing_contractor', 'general_contractor'],
  'Pest Control': ['pest_control_service'],
  Roofing: ['roofing_contractor', 'general_contractor'],
  Painting: ['painter', 'general_contractor'],
  Handyman: ['general_contractor'],
  Landscaping: ['landscaping_service', 'lawn_care_service'],
}

function isPlaceOnTrade(place: PlaceDiscoveryResult, cfg: TradeConfig): boolean {
  const types = (place.google_types || []).map((t) => t.toLowerCase())
  const allow = TRADE_TYPE_ALIASES[cfg.trade]
  const typeHit = types.some((t) => allow.includes(t))
  if (typeHit) return true

  // Type didn't match - accept if the business name implies the trade.
  const rx = TRADE_KEYWORD_RE[cfg.trade]
  return rx.test(place.business_name || '')
}

export const placesSources: SourceDefinition[] = TRADES.map((cfg) => ({
  id: cfg.id,
  label: cfg.label,
  description: cfg.description,
  trade: cfg.trade,
  run: (params, opts) => runPlaces(cfg, params, opts),
}))
