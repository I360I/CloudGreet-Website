/**
 * Ohio Mode - statewide multi-trade sweep via Google Places.
 *
 * Built for Aaron's onboarding demo. Mirrors the structure of
 * quality-mode.ts but locked to Ohio metros and runs across the
 * trades that have density there: HVAC, Plumbing, Electrical,
 * Roofing, and Landscaping.
 *
 * Why Places-only and not the state license database (yet):
 *   Ohio Construction Industry Licensing Board (OCILB) DOES license
 *   HVAC, plumbing, electrical, refrigeration, and hydronics. Their
 *   public lookup lives at the eLicense Ohio portal. Roofing is NOT
 *   state-licensed in Ohio - mostly local-permit only. Pest control
 *   is via Ohio Dept of Agriculture (separate registry).
 *
 *   TODO (next session): add tdlr-style scrapers for OCILB by trade
 *   so we can offer "OCILB · HVAC contractors" etc. with the owner's
 *   legal name + license number, same as TDLR for Texas. Until then
 *   this Places-only mode is what reps demo to Ohio prospects.
 *
 * Quality strictness slider (loose / standard / strict) is honored
 * the same way Quality Mode honors it - reps can dial up filtering
 * during the demo to show how it adapts.
 */

import { logger } from '../monitoring'
import { discoverPlaces, isGooglePlacesConfigured } from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import { US_METROS } from './us-metros'
import type { ScrapeParams, ScrapeRecord, SourceDefinition, SourceRunOpts } from './types'

type OhioTrade = {
  trade: SourceDefinition['trade']
  textQuery: string
  /** Google Places type token to confirm trade match in post-filter. */
  typeToken: string
}

const OHIO_TRADES: OhioTrade[] = [
  { trade: 'HVAC',         textQuery: 'hvac contractors',     typeToken: 'hvac' },
  { trade: 'Plumbing',     textQuery: 'plumbing contractors', typeToken: 'plumb' },
  { trade: 'Electrical',   textQuery: 'electrical contractors', typeToken: 'electric' },
  { trade: 'Roofing',      textQuery: 'roofing contractors',  typeToken: 'roof' },
  { trade: 'Landscaping',  textQuery: 'landscaping companies', typeToken: 'landscap' },
]

const OHIO_METROS = US_METROS.filter((m) => m.state === 'OH')

// Same rectangle-restriction radius as Quality Mode metro passes.
const OHIO_RADIUS_METERS = 40_000

// Defaults for the standard strictness band. Loose drops floors entirely;
// strict raises them.
const STD_MIN_RATING = 4.0
const STD_MIN_REVIEWS = 10

const NAME_BLOCKLIST = [
  // Big national chains that show up in Ohio metros and aren't the
  // solo/small-shop buyer profile we want.
  'mr. rooter', 'roto-rooter', 'one hour heating',
  'horizon services', 'a-1 american', 'lee company',
  'service experts', 'aire serv', 'arsi',
  'benjamin franklin plumbing', 'mister sparky',
]

async function* runOhio(
  params: ScrapeParams,
  opts: SourceRunOpts,
): AsyncGenerator<ScrapeRecord, void, void> {
  const diag = opts.diag
  if (!isGooglePlacesConfigured()) {
    diag?.push('GOOGLE_PLACES_API_KEY missing - Ohio mode skipped entirely')
    return
  }

  const limit = Math.max(1, Math.min(200, params.limit ?? 30))
  const seen = opts.seen
  const qualityLevel = (params.extra?.quality as 'loose' | 'standard' | 'strict' | undefined) || 'standard'
  const minRating = qualityLevel === 'strict' ? 4.0 : qualityLevel === 'loose' ? 0 : STD_MIN_RATING
  const minReviews = qualityLevel === 'strict' ? 20 : qualityLevel === 'loose' ? 0 : STD_MIN_REVIEWS
  const requireWebsite = qualityLevel === 'strict'

  diag?.push(`ohio mode start: ${OHIO_METROS.length} metros x ${OHIO_TRADES.length} trades · strictness=${qualityLevel}`)

  // Geographic diversity cap so Cleveland (first metro alphabetically
  // by population) doesn't hog every batch.
  const totalCells = OHIO_METROS.length * OHIO_TRADES.length
  const maxPerCell = Math.max(2, Math.ceil(limit / totalCells) + 1)

  const localPhones = new Set<string>()
  const localPlaceIds = new Set<string>()
  let totalYielded = 0
  let totalDropped = 0

  outer: for (const metro of OHIO_METROS) {
    for (const cfg of OHIO_TRADES) {
      if (totalYielded >= limit) break outer

      const query = `${cfg.textQuery} near ${metro.name} OH`
      let kept = 0
      let dropped = 0
      const cellCap = Math.min(maxPerCell, limit - totalYielded)

      try {
        for await (const place of discoverPlaces(query, {
          maxResults: 20,
          minReviewCount: minReviews,
          minRating,
          excludeClosed: true,
          stateAllowList: ['OH'],
          locationRestriction: {
            lat: metro.lat,
            lng: metro.lng,
            radiusMeters: OHIO_RADIUS_METERS,
          },
          onDiag: (m) => diag?.push(m),
        })) {
          if (totalYielded >= limit) break
          if (kept >= cellCap) break

          // Trade-match post-filter via google_types token.
          const types = (place.google_types || []).map((t) => t.toLowerCase())
          const tradeMatched = types.some((t) => t.includes(cfg.typeToken)) || qualityLevel === 'loose'
          if (!tradeMatched) { dropped++; continue }

          // Branded chain blocklist.
          const lowerName = (place.business_name || '').toLowerCase()
          if (NAME_BLOCKLIST.some((n) => lowerName.includes(n))) { dropped++; continue }

          const phone = normalizePhone(place.phone)
          if (!phone) { dropped++; continue }

          const website = normalizeWebsite(place.website)
          if (requireWebsite && !website) { dropped++; continue }

          const placeId = place.place_id || ''
          const nameKey = businessNameKey(place.business_name, place.city)

          if (seen) {
            if (seen.phones.has(phone)) { dropped++; continue }
            if (placeId && seen.placeIds.has(placeId)) { dropped++; continue }
            if (website && seen.websites.has(website)) { dropped++; continue }
            if (nameKey && seen.nameKeys.has(nameKey)) { dropped++; continue }
          }
          if (localPhones.has(phone)) { dropped++; continue }
          if (placeId && localPlaceIds.has(placeId)) { dropped++; continue }
          localPhones.add(phone)
          if (placeId) localPlaceIds.add(placeId)

          const rating = place.rating ?? 0
          const reviews = place.review_count ?? 0
          const score =
            rating *
            Math.log10(Math.max(10, reviews)) *
            (website ? 1.2 : 1.0)

          yield {
            source: 'ohio_mode',
            business_name: place.business_name,
            owner_name: null,
            business_type: cfg.trade,
            phone,
            website: place.website,
            address: place.address,
            city: place.city,
            state: place.state || 'OH',
            zip: place.zip,
            raw: {
              google_place_id: place.place_id,
              google_types: place.google_types,
              google_rating: place.rating,
              google_review_count: place.review_count,
              google_business_status: place.business_status,
              quality_score: Number(score.toFixed(3)),
              metro: metro.name,
              ohio_mode_trade: cfg.trade,
            },
          }
          kept++
          totalYielded++
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown'
        logger.warn('ohio mode metro pass threw', {
          metro: metro.name, trade: cfg.trade, error: msg,
        })
        diag?.push(`${metro.name}/${cfg.trade} threw: ${msg}`)
      }
      totalDropped += dropped
      diag?.push(`${metro.name}/${cfg.trade}: kept=${kept} dropped=${dropped}`)
    }
  }

  logger.info('ohio mode complete', {
    yielded: totalYielded, dropped: totalDropped, limit,
  })
}

export const ohioModeSource: SourceDefinition = {
  id: 'ohio_mode',
  label: 'Ohio mode · top contractors statewide',
  // Default trade is HVAC since it's first in the rotation; the per-record
  // business_type is what actually drives the leads view.
  trade: 'HVAC',
  description:
    'Sweeps Ohio metros (Columbus, Cleveland, Cincinnati, Toledo, Akron, Dayton, Youngstown, Canton) across HVAC, Plumbing, Electrical, Roofing, and Landscaping. Drops branded chains (Mr. Rooter, Roto-Rooter, Service Experts, etc) and applies the same strictness slider as Quality Mode. Best for working Ohio prospects without typing in each city by hand.',
  run: runOhio,
}
