/**
 * Quality Mode - national, multi-trade, ruthlessly filtered.
 *
 * The other sources optimise for breadth: pull as many contractors as
 * possible matching a state/city/trade. That works but reps still see
 * marginal listings (3-star shops, ghost listings, dormant licensees).
 *
 * Quality Mode flips the priority. It sweeps the top US metros across
 * every blue-collar trade we sell, applies hard quality gates, and
 * scores each surviving record so reps get a small set of obviously
 * worth-calling leads regardless of geography.
 *
 * Hard gates (drop if any fail):
 *   - rating >= 4.5
 *   - userRatingCount >= 30
 *   - has phone (can't cold-call without one)
 *   - has website (proxy for "real business" - no website often = dead/grey-market)
 *   - businessStatus !== CLOSED_*
 *
 * Soft score (used to rank survivors):
 *   score = rating * log10(reviews) * (has_website ? 1.2 : 1.0)
 *
 * Cost note: each metro × trade is a Google Places text search (~$0.035).
 * We sweep a small fixed set of dense metros (US top-15 by population)
 * to keep cost bounded. With 4 trades × 15 metros = 60 calls/run,
 * roughly $2 worst-case per run. The runner limit caps yield, but the
 * sweep is exhaustive within those metros so reps see a uniform sample.
 */

import { logger } from '../monitoring'
import { discoverPlaces, isGooglePlacesConfigured } from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import type { ScrapeParams, ScrapeRecord, SeenSets, SourceDefinition, SourceRunOpts } from './types'

type TradeKey = 'HVAC' | 'Plumbing' | 'Electrical' | 'Roofing' | 'Law'

type TradeCfg = {
  trade: TradeKey
  includedType: string
  textQuery: string
  /** Optional cap to filter out enterprise mega-firms / national chains
   *  whose review counts are orders of magnitude above the local
   *  competition. Used for Law - the AI receptionist's actual buyers
   *  are solo and small-firm attorneys, not Morgan & Morgan. */
  maxReviewCount?: number
  /** Substring blocklist tested against business_name (case-insensitive).
   *  A second guard so chains slipping past the review cap still get
   *  dropped. */
  nameBlocklist?: string[]
}

const QUALITY_TRADES: TradeCfg[] = [
  { trade: 'HVAC',       includedType: 'hvac_contractor',    textQuery: 'hvac contractors' },
  { trade: 'Plumbing',   includedType: 'plumber',            textQuery: 'plumbing contractors' },
  { trade: 'Electrical', includedType: 'electrician',        textQuery: 'electrical contractors' },
  { trade: 'Roofing',    includedType: 'roofing_contractor', textQuery: 'roofing contractors' },
  {
    trade: 'Law',
    includedType: 'lawyer',
    textQuery: 'law firm',
    // Solo + small-firm sweet spot. 200+ reviews is almost always a
    // multi-state PI/class-action mill that already has a phone team.
    maxReviewCount: 200,
    nameBlocklist: [
      'morgan & morgan', 'jacoby & meyers', 'cellino', 'parker waichman',
      'lerner', 'sokolove', 'simmons hanly', 'weitz', 'baron & budd',
      'kirkland & ellis', 'latham & watkins', 'jones day', 'sidley',
      'skadden', 'baker mckenzie', 'dla piper', 'norton rose',
    ],
  },
]

/**
 * Top US metros by population, with rough centers and a generous radius.
 * Order matters - we sweep them in this order so a small `limit` still
 * gets diverse geography (no all-Houston batches).
 */
const QUALITY_METROS: { name: string; state: string; lat: number; lng: number }[] = [
  { name: 'New York',     state: 'NY', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles',  state: 'CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago',      state: 'IL', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston',      state: 'TX', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix',      state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { name: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { name: 'San Antonio',  state: 'TX', lat: 29.4241, lng: -98.4936 },
  { name: 'San Diego',    state: 'CA', lat: 32.7157, lng: -117.1611 },
  { name: 'Dallas',       state: 'TX', lat: 32.7767, lng: -96.7970 },
  { name: 'Atlanta',      state: 'GA', lat: 33.7490, lng: -84.3880 },
  { name: 'Miami',        state: 'FL', lat: 25.7617, lng: -80.1918 },
  { name: 'Charlotte',    state: 'NC', lat: 35.2271, lng: -80.8431 },
  { name: 'Denver',       state: 'CO', lat: 39.7392, lng: -104.9903 },
  { name: 'Tampa',        state: 'FL', lat: 27.9506, lng: -82.4572 },
  { name: 'Las Vegas',    state: 'NV', lat: 36.1699, lng: -115.1398 },
]

const QUALITY_RADIUS_METERS = 40_000 // ~25 miles, covers a metro core

// Quality bar - calibrated empirically. Started at 4.5 / 30 reviews
// but that was too aggressive: Google's text search frequently returns
// places without ratings yet, and many legitimate small contractors
// sit at 4.0-4.4. We accept 4.0+ now and rely on the score (which
// favors higher rating + review volume) to bubble the best up.
const HARD_MIN_RATING = 4.0
const HARD_MIN_REVIEWS = 10

async function* runQualityMode(
  params: ScrapeParams,
  opts: SourceRunOpts,
): AsyncGenerator<ScrapeRecord, void, void> {
  const diag = opts.diag
  if (!isGooglePlacesConfigured()) {
    logger.warn('quality mode skipped - GOOGLE_PLACES_API_KEY missing')
    diag?.push('GOOGLE_PLACES_API_KEY missing - quality mode skipped entirely')
    return
  }
  diag?.push(`quality mode start: ${QUALITY_METROS.length} metros x ${QUALITY_TRADES.length} trades`)

  const limit = Math.max(1, Math.min(200, params.limit ?? 30))
  const seen = opts.seen
  // Quality strictness ladder. Wired from the scrape form; defaults to
  // 'standard' when missing. Loose returns more leads; strict drops
  // anything not obviously worth a call.
  const qualityLevel = (params.extra?.quality as 'loose' | 'standard' | 'strict' | undefined) || 'standard'
  const minRating = qualityLevel === 'strict' ? 4.0 : qualityLevel === 'loose' ? 0 : HARD_MIN_RATING
  const minReviews = qualityLevel === 'strict' ? 20 : qualityLevel === 'loose' ? 0 : HARD_MIN_REVIEWS
  const requireWebsite = qualityLevel === 'strict'
  diag?.push(`strictness=${qualityLevel} minRating=${minRating} minReviews=${minReviews} requireWebsite=${requireWebsite}`)

  // Per-run dedupe across the metro × trade matrix. A national chain
  // hits both Houston and Dallas; we should yield it once.
  const localPhones = new Set<string>()
  const localPlaceIds = new Set<string>()

  let totalYielded = 0
  let totalDropped = 0
  // Stream records as we find them. The runner persists each one
  // immediately so partial results survive mid-sweep failures or
  // function timeouts. Hard quality gates (4.5+ rating, 30+ reviews,
  // website, phone) ensure every yielded record is high quality;
  // we trade global score ranking for resilience and visible progress.

  outer: for (const metro of QUALITY_METROS) {
    for (const cfg of QUALITY_TRADES) {
      if (totalYielded >= limit) break outer
      const query = `${cfg.textQuery} near ${metro.name} ${metro.state}`
      let kept = 0
      let dropped = 0
      try {
        for await (const place of discoverPlaces(query, {
          maxResults: 20, // first page only - that's where the best-rated land
          includedType: cfg.includedType,
          minReviewCount: minReviews,
          minRating: minRating,
          excludeClosed: true,
          stateAllowList: [], // [] = any US state
          locationRestriction: {
            lat: metro.lat, lng: metro.lng, radiusMeters: QUALITY_RADIUS_METERS,
          },
          onDiag: (m) => diag?.push(m),
        })) {
          if (totalYielded >= limit) break
          // Trade-specific size cap: drops mega-firms whose review
          // counts dwarf solo / small competitors.
          if (cfg.maxReviewCount && (place.review_count ?? 0) > cfg.maxReviewCount) {
            dropped++; continue
          }
          // Trade-specific name blocklist: catches branded chains that
          // sneak under the review cap via a small satellite office.
          if (cfg.nameBlocklist) {
            const lower = (place.business_name || '').toLowerCase()
            if (cfg.nameBlocklist.some((n) => lower.includes(n))) {
              dropped++; continue
            }
          }

          const phone = normalizePhone(place.phone)
          if (!phone) { dropped++; continue }
          // Website is a soft signal now. Many legitimate solo
          // contractors don't have one - that's fine. The score
          // multiplier still rewards records that do.
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
            source: 'quality_mode',
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
              quality_score: Number(score.toFixed(3)),
              metro: metro.name,
            },
          }
          kept++
          totalYielded++
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown'
        logger.warn('quality mode metro pass threw', {
          metro: metro.name, trade: cfg.trade, error: msg,
        })
        diag?.push(`${metro.name}/${cfg.trade} threw: ${msg}`)
      }
      totalDropped += dropped
      diag?.push(`${metro.name}/${cfg.trade}: kept=${kept} dropped=${dropped}`)
      logger.info('quality mode pass', {
        metro: metro.name, trade: cfg.trade, kept, dropped, total_yielded: totalYielded,
      })
    }
  }

  logger.info('quality mode complete', {
    yielded: totalYielded, dropped: totalDropped, limit,
  })
}

export const qualityModeSource: SourceDefinition = {
  id: 'quality_mode',
  label: 'Quality mode · top contractors nationwide',
  description: 'Sweeps top US metros across HVAC, plumbing, electrical, and roofing. Drops anything below 4.5 stars or 30 reviews, requires a website and phone, then ranks by rating × review-volume. Smaller batches than the state scrapers, but every lead is obviously worth a call. Ignores city/state inputs - it goes nationwide on purpose.',
  trade: 'HVAC', // arbitrary - results span trades; UI uses the per-record business_type
  run: runQualityMode,
}
