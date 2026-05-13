/**
 * Arizona Mode - statewide multi-trade sweep via Google Places.
 *
 * Mirrors the structure of ohio-mode.ts but locked to Arizona metros
 * (Phoenix, Tucson, Mesa, Chandler, Glendale, Scottsdale, Gilbert,
 * Tempe, Peoria, Surprise, Yuma, Flagstaff) and the trades that have
 * density there: HVAC, Plumbing, Electrical, Roofing, Landscaping.
 *
 * Why Places-only (and not the state license database yet):
 *   Arizona Registrar of Contractors (ROC, azroc.gov) is a real public
 *   contractor license database — searchable by trade, returns business
 *   legal name + owner + license #. The same TDLR-style cross-reference
 *   we use for Texas is feasible here; it's just not built yet.
 *
 *   TODO (next session): add an azroc.ts scraper that feeds AZ ROC
 *   classifications (CR-39 air conditioning, CR-37 electrical, CR-65
 *   plumbing, etc.) and enriches via Google Places the same way TDLR
 *   does. Until then this Places-only mode is what reps demo to
 *   Arizona prospects.
 *
 * Quality strictness slider (loose / standard / strict) is honored the
 * same way Quality Mode + Ohio Mode honor it.
 */

import { logger } from '../monitoring'
import { discoverPlaces, isGooglePlacesConfigured } from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import { US_METROS } from './us-metros'
import type { ScrapeParams, ScrapeRecord, SourceDefinition, SourceRunOpts } from './types'

type ArizonaTrade = {
  trade: SourceDefinition['trade']
  textQuery: string
  /** Google Places type token to confirm trade match in post-filter. */
  typeToken: string
}

const ARIZONA_TRADES: ArizonaTrade[] = [
  { trade: 'HVAC',        textQuery: 'hvac contractors',       typeToken: 'hvac' },
  { trade: 'Plumbing',    textQuery: 'plumbing contractors',   typeToken: 'plumb' },
  { trade: 'Electrical',  textQuery: 'electrical contractors', typeToken: 'electric' },
  { trade: 'Roofing',     textQuery: 'roofing contractors',    typeToken: 'roof' },
  { trade: 'Landscaping', textQuery: 'landscaping companies',  typeToken: 'landscap' },
]

const ARIZONA_METROS = US_METROS.filter((m) => m.state === 'AZ')

const ARIZONA_RADIUS_METERS = 40_000

const STD_MIN_RATING = 4.0
const STD_MIN_REVIEWS = 10

const NAME_BLOCKLIST = [
  // Big national chains common in Phoenix/Tucson that don't fit the
  // small-shop buyer profile.
  'mr. rooter', 'roto-rooter', 'one hour heating',
  'horizon services', 'service experts', 'aire serv',
  'benjamin franklin plumbing', 'mister sparky',
  'george brazil', 'parker & sons', 'goettl',
]

async function* runArizona(
  params: ScrapeParams,
  opts: SourceRunOpts,
): AsyncGenerator<ScrapeRecord, void, void> {
  const diag = opts.diag
  if (!isGooglePlacesConfigured()) {
    diag?.push('GOOGLE_PLACES_API_KEY missing - Arizona mode skipped entirely')
    return
  }

  const limit = Math.max(1, Math.min(200, params.limit ?? 30))
  const seen = opts.seen
  const qualityLevel = (params.extra?.quality as 'loose' | 'standard' | 'strict' | undefined) || 'standard'
  const minRating = qualityLevel === 'strict' ? 4.0 : qualityLevel === 'loose' ? 0 : STD_MIN_RATING
  const minReviews = qualityLevel === 'strict' ? 20 : qualityLevel === 'loose' ? 0 : STD_MIN_REVIEWS
  const requireWebsite = qualityLevel === 'strict'

  diag?.push(`arizona mode start: ${ARIZONA_METROS.length} metros x ${ARIZONA_TRADES.length} trades · strictness=${qualityLevel}`)

  const totalCells = ARIZONA_METROS.length * ARIZONA_TRADES.length
  const maxPerCell = Math.max(2, Math.ceil(limit / totalCells) + 1)

  const localPhones = new Set<string>()
  const localPlaceIds = new Set<string>()
  let totalYielded = 0
  let totalDropped = 0

  outer: for (const metro of ARIZONA_METROS) {
    for (const cfg of ARIZONA_TRADES) {
      if (totalYielded >= limit) break outer

      const query = `${cfg.textQuery} near ${metro.name} AZ`
      let kept = 0
      let dropped = 0
      const cellCap = Math.min(maxPerCell, limit - totalYielded)

      try {
        for await (const place of discoverPlaces(query, {
          maxResults: 20,
          minReviewCount: minReviews,
          minRating,
          excludeClosed: true,
          stateAllowList: ['AZ'],
          locationRestriction: {
            lat: metro.lat,
            lng: metro.lng,
            radiusMeters: ARIZONA_RADIUS_METERS,
          },
          onDiag: (m) => diag?.push(m),
        })) {
          if (totalYielded >= limit) break
          if (kept >= cellCap) break

          const types = (place.google_types || []).map((t) => t.toLowerCase())
          const tradeMatched = types.some((t) => t.includes(cfg.typeToken)) || qualityLevel === 'loose'
          if (!tradeMatched) { dropped++; continue }

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
            source: 'arizona_mode',
            business_name: place.business_name,
            owner_name: null,
            business_type: cfg.trade,
            phone,
            website: place.website,
            address: place.address,
            city: place.city,
            state: place.state || 'AZ',
            zip: place.zip,
            raw: {
              google_place_id: place.place_id,
              google_types: place.google_types,
              google_rating: place.rating,
              google_review_count: place.review_count,
              google_business_status: place.business_status,
              quality_score: Number(score.toFixed(3)),
              metro: metro.name,
              arizona_mode_trade: cfg.trade,
            },
          }
          kept++
          totalYielded++
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown'
        logger.warn('arizona mode metro pass threw', {
          metro: metro.name, trade: cfg.trade, error: msg,
        })
        diag?.push(`${metro.name}/${cfg.trade} threw: ${msg}`)
      }
      totalDropped += dropped
      diag?.push(`${metro.name}/${cfg.trade}: kept=${kept} dropped=${dropped}`)
    }
  }

  logger.info('arizona mode complete', {
    yielded: totalYielded, dropped: totalDropped, limit,
  })
}

export const arizonaModeSource: SourceDefinition = {
  id: 'arizona_mode',
  label: 'Arizona mode · top contractors statewide',
  trade: 'HVAC',
  description:
    'Sweeps Arizona metros (Phoenix, Tucson, Mesa, Scottsdale, Gilbert, Chandler) across HVAC, Plumbing, Electrical, Roofing, and Landscaping. Drops branded chains (George Brazil, Parker & Sons, Goettl, Service Experts, etc) and applies the same strictness slider as Quality Mode. Best for working Arizona prospects without typing in each city by hand.',
  run: runArizona,
}
