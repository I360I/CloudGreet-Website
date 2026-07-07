import { discoverPlaces, txCityCoords, TX_CITY_COORDS } from './google-places'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import { resolveUsMetro, resolveUsState, NATIONAL_FANOUT } from './us-metros'
import { logger } from '../monitoring'
import type { ScrapeParams, ScrapeRecord, SourceDefinition, SourceRunOpts } from './types'

/*
 * Generic Google Places discovery for the natural-language AI lead
 * search ("100 HVAC guys in Dallas"). Any category, any US city. The
 * ai-search endpoint parses the request and hands us:
 *   params.extra.query        - Places search term, e.g. "hvac contractor"
 *   params.extra.trade_label  - friendly label stored as business_type
 *   params.location           - city (and/or state) text
 *
 * Non-TX-license trades get NO owner name from here (Google doesn't
 * expose it) - the website owner-name enrichment + AI verification fill
 * that in afterward. TX-license trades are routed to the license source
 * instead (by the endpoint) so they arrive WITH owner names.
 */
export const aiPlaces: SourceDefinition = {
  id: 'ai_places',
  label: 'AI search (Google Places)',
  description: 'Natural-language business search across the US.',
  trade: 'Other',
  run: async function* (params: ScrapeParams, opts: SourceRunOpts): AsyncGenerator<ScrapeRecord, void, void> {
    const limit = Math.max(1, Math.min(500, params.limit ?? 100))
    const query = String(params.extra?.query || '').trim()
    if (!query) return
    const tradeLabel = String(params.extra?.trade_label || '').trim() || null
    const cityRaw = (params.location || '').trim()
    const diag = opts.diag

    type Target = { name: string; state: string; lat: number; lng: number }
    let targets: Target[] = []
    const cleaned = cityRaw.toLowerCase().replace(/\s*,?\s*(tx|texas)\s*$/, '').trim()
    if (cleaned && TX_CITY_COORDS[cleaned]) {
      const c = txCityCoords(cityRaw)!
      targets = [{ name: cleaned, state: 'TX', lat: c.lat, lng: c.lng }]
    } else {
      const us = resolveUsMetro(cityRaw)
      if (us) targets = [us]
      else {
        const stateMetros = resolveUsState(cityRaw)
        targets = stateMetros.length ? stateMetros : NATIONAL_FANOUT
      }
    }

    const seen = opts.seen
    const localPhones = new Set<string>()
    const localPlaceIds = new Set<string>()
    let totalYielded = 0
    const radiusMeters = 40_000

    for (const target of targets) {
      if (totalYielded >= limit) break
      const remaining = limit - totalYielded
      const askPerCity = Math.min(60, Math.max(20, remaining * 3))

      for await (const place of discoverPlaces(`${query} near ${target.name} ${target.state}`, {
        maxResults: askPerCity,
        minReviewCount: 1, // drop ghost listings
        stateAllowList: [target.state],
        locationRestriction: { lat: target.lat, lng: target.lng, radiusMeters },
        onDiag: (m) => diag?.push(m),
      })) {
        if (totalYielded >= limit) break
        const phone = normalizePhone(place.phone)
        if (!phone) continue
        const website = normalizeWebsite(place.website)
        const placeId = place.place_id || ''
        const nameKey = businessNameKey(place.business_name, place.city)
        if (seen) {
          if (seen.phones.has(phone)) continue
          if (placeId && seen.placeIds.has(placeId)) continue
          if (website && seen.websites.has(website)) continue
          if (nameKey && seen.nameKeys.has(nameKey)) continue
        }
        if (localPhones.has(phone)) continue
        if (placeId && localPlaceIds.has(placeId)) continue
        localPhones.add(phone)
        if (placeId) localPlaceIds.add(placeId)

        yield {
          source: 'ai_places',
          business_name: place.business_name,
          owner_name: null,
          phone,
          website: place.website,
          business_type: tradeLabel,
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
            query,
          },
        }
        totalYielded++
      }
      if (targets.length === 1) break
    }
    diag?.push(`ai_places: ${totalYielded} yielded for "${query}"`)
    logger.info('ai_places done', { query, city: cityRaw, yielded: totalYielded })
  },
}
