import { discoverPlaces } from './google-places'
import type { ScrapeParams, ScrapeRecord, SourceDefinition } from './types'

/**
 * Google Places direct discovery for trades that don't have a Texas
 * licensing database. Same shape as the TDLR/TSBPE/TDA flow, but the
 * starting point is a free-text query against Places API instead of a
 * public license CSV.
 *
 * Owner name is always null — Google Places doesn't expose it.
 *
 * Cost: each Text Search Pro call returns up to 20 places at ~$0.035.
 * A typical 100-result pull = 5 calls = ~$0.18. Well inside Google's
 * $200/month free credit.
 */

type TradeId = 'roofing' | 'painting' | 'handyman' | 'landscaping'

const TRADES: Record<TradeId, {
 trade: SourceDefinition['trade']
 label: string
 description: string
 query: string  // search keyword phrase (what we'd type into Maps)
}> = {
 roofing: {
  trade: 'Roofing',
  label: 'Google · Roofing',
  description:
   'Direct Google Places discovery for roofing contractors. Texas doesn\'t license roofers, so this is the cleanest free path. Returns business / phone / website / address; no owner name.',
  query: 'roofing contractors',
 },
 painting: {
  trade: 'Painting',
  label: 'Google · Painting',
  description:
   'Direct Google Places discovery for painting contractors. Returns business / phone / website / address; no owner name.',
  query: 'painting contractors',
 },
 handyman: {
  trade: 'Handyman',
  label: 'Google · Handyman',
  description:
   'Direct Google Places discovery for handyman / general repair services. Returns business / phone / website / address; no owner name.',
  query: 'handyman services',
 },
 landscaping: {
  trade: 'Landscaping',
  label: 'Google · Landscaping',
  description:
   'Direct Google Places discovery for landscaping / lawn care. Returns business / phone / website / address; no owner name.',
  query: 'landscaping companies',
 },
}

function buildSource(id: TradeId): SourceDefinition {
 const meta = TRADES[id]
 return {
  id: `google_${id}`,
  label: meta.label,
  description: meta.description,
  trade: meta.trade,
  run: async function* (params: ScrapeParams) {
   const limit = Math.max(1, Math.min(2000, params.limit ?? 100))
   const location = params.location?.trim()
    ? `${params.location.trim()}, TX`
    : 'Texas'
   const query = `${meta.query} in ${location}`

   for await (const place of discoverPlaces(query, { maxResults: limit })) {
    const record: ScrapeRecord = {
     source: `google_${id}`,
     business_name: place.business_name,
     owner_name: null,
     phone: place.phone,
     website: place.website,
     business_type: meta.trade,
     address: place.address,
     city: place.city,
     state: place.state || 'TX',
     zip: place.zip,
     raw: { query, google_types: place.google_types, place_id: place.place_id },
    }
    yield record
   }
  },
 }
}

export const googleRoofing = buildSource('roofing')
export const googlePainting = buildSource('painting')
export const googleHandyman = buildSource('handyman')
export const googleLandscaping = buildSource('landscaping')
