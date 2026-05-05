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
  isGooglePlacesConfigured,
  type PlaceDiscoveryResult,
} from './google-places'
import type { ScrapeParams, ScrapeRecord, SourceDefinition } from './types'

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

async function* runPlaces(
  cfg: TradeConfig,
  params: ScrapeParams,
): AsyncGenerator<ScrapeRecord, void, void> {
  if (!isGooglePlacesConfigured()) {
    logger.warn('places discovery skipped - GOOGLE_PLACES_API_KEY missing')
    return
  }

  const cityRaw = (params.location || 'Austin').trim()
  const center = txCityCoords(cityRaw)
  const limit = Math.max(1, Math.min(2000, params.limit ?? 100))
  const minReviewCount =
    typeof params.extra?.minReviewCount === 'number' ? params.extra.minReviewCount as number : 3
  const radiusMiles =
    typeof params.extra?.radiusMiles === 'number' ? params.extra.radiusMiles as number : 30
  const radiusMeters = Math.round(radiusMiles * 1609.34)
  const minRating =
    typeof params.extra?.minRating === 'number' ? params.extra.minRating as number : 0

  // We require a hard restriction when we know the city - Google's
  // text-search will otherwise drift to higher-ranked metros (e.g.
  // typing "hvac contractors Austin TX" returns Houston SEOs because
  // they outrank). Restriction guarantees the result is in radius.
  const query = `${cfg.textQuery} near ${cityRaw} TX`
  let yielded = 0
  let dropped = 0

  for await (const place of discoverPlaces(query, {
    maxResults: Math.min(60, limit * 3), // Text search caps at ~60 / call regardless
    includedType: cfg.includedType,
    minReviewCount,
    minRating,
    locationRestriction: center
      ? { lat: center.lat, lng: center.lng, radiusMeters }
      : undefined,
    // No city center known → fall back to soft TX rectangle bias inside discoverPlaces
  })) {
    if (yielded >= limit) break

    // Final type/keyword sanity check: Google sometimes returns broader
    // types for an HVAC includedType query (e.g. general_contractor).
    // That's fine, but if we got a flat 'point_of_interest' with no
    // contractor tag and no trade keyword in the name, drop it.
    if (!isPlaceOnTrade(place, cfg)) { dropped++; continue }

    const phone = normalizePhone(place.phone)
    if (!phone) { dropped++; continue } // No phone = nothing to cold-call

    yield {
      source: cfg.id,
      business_name: place.business_name,
      owner_name: null, // Google doesn't expose owner names
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
      },
    }
    yielded++
  }

  if (dropped > 0) {
    logger.info('places discovery filter', {
      source: cfg.id, city: cityRaw, yielded, dropped,
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

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null
  const digits = p.replace(/[^0-9]/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export const placesSources: SourceDefinition[] = TRADES.map((cfg) => ({
  id: cfg.id,
  label: cfg.label,
  description: cfg.description,
  trade: cfg.trade,
  run: (params) => runPlaces(cfg, params),
}))
