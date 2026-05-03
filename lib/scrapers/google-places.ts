import { logger } from '../monitoring'

/**
 * Google Places API (New) text-search enrichment.
 *
 * Given a business name + city, return phone, website, and Google's
 * canonical types so the scraper can fill in the fields that the TDLR /
 * TSBPE / TDA license databases don't expose.
 *
 * Cost (with field mask): one Text Search Pro call per enrichment,
 * roughly $0.035 per call. Google gives $200/month free credit, so a
 * few thousand enrichments stay free.
 */

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'

const FIELD_MASK = [
 'places.displayName',
 'places.formattedAddress',
 'places.internationalPhoneNumber',
 'places.nationalPhoneNumber',
 'places.websiteUri',
 'places.types',
 'places.id',
 'places.location',
].join(',')

export type PlacesEnrichment = {
 phone: string | null
 website: string | null
 google_types: string[]
 matched_name: string | null
 matched_address: string | null
 place_id: string | null
}

export type PlacesAttempt =
 | { ok: true; data: PlacesEnrichment }
 | { ok: false; error: string }

export function isGooglePlacesConfigured(): boolean {
 return !!process.env.GOOGLE_PLACES_API_KEY
}

export async function enrichWithGooglePlaces(
 businessName: string,
 city: string | null | undefined,
): Promise<PlacesAttempt> {
 const key = process.env.GOOGLE_PLACES_API_KEY
 if (!key) return { ok: false, error: 'GOOGLE_PLACES_API_KEY missing at runtime' }
 if (!businessName) return { ok: false, error: 'no business name' }

 const query = city ? `${businessName} ${city} TX` : `${businessName} Texas`

 try {
  const res = await fetch(ENDPOINT, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': key,
    'X-Goog-FieldMask': FIELD_MASK,
   },
   body: JSON.stringify({
    textQuery: query,
    maxResultCount: 1,
    regionCode: 'US',
    languageCode: 'en',
   }),
  })

  if (!res.ok) {
   const body = await res.text().catch(() => '')
   const trimmed = body.slice(0, 300)
   logger.warn('Google Places search failed', {
    status: res.status, body: trimmed, query,
   })
   // Try to parse Google's error envelope so the message is user-friendly.
   let msg = `${res.status} ${res.statusText}`
   try {
    const j = JSON.parse(body)
    msg = j?.error?.message || j?.error?.status || msg
   } catch {}
   return { ok: false, error: `${res.status}: ${msg}` }
  }

  const data = await res.json()
  const place = data?.places?.[0]
  if (!place) return { ok: false, error: 'no match' }

  // Reject results outside Texas — common business names like "Allied
  // Mechanical" otherwise match the wrong state's listing.
  const addr: string = place.formattedAddress || ''
  if (!isTexasAddress(addr)) {
   return { ok: false, error: `match outside TX (${addr.slice(0, 80) || 'no address'})` }
  }

  return {
   ok: true,
   data: {
    phone: place.internationalPhoneNumber || place.nationalPhoneNumber || null,
    website: place.websiteUri || null,
    google_types: Array.isArray(place.types) ? place.types : [],
    matched_name: place.displayName?.text || null,
    matched_address: place.formattedAddress || null,
    place_id: place.id || null,
   },
  }
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  logger.warn('Google Places call threw', { error: msg, query })
  return { ok: false, error: `network: ${msg}` }
 }
}

/**
 * True if a Google formattedAddress sits in Texas. We accept the explicit
 * "TX" two-letter abbreviation in any segment and the spelled-out "Texas"
 * — Google sometimes returns one or the other depending on the locality.
 */
export function isTexasAddress(addr: string): boolean {
 if (!addr) return false
 const upper = addr.toUpperCase()
 // Match ", TX" with optional zip following, or ", Texas"
 if (/,\s*TX(\s+\d{5})?(\s*,|\s*$)/i.test(addr)) return true
 if (upper.includes(', TEXAS')) return true
 return false
}

/* ------------------------------- Discovery ------------------------------- */

/**
 * Discovery mode (vs enrichment): start from a free-text trade query like
 * "roofing contractors near Austin, TX" and walk the paginated results.
 * Used for trades that don't have a Texas licensing database (roofing,
 * painting, handyman, landscaping).
 */

export type PlaceDiscoveryResult = {
 business_name: string
 phone: string | null
 website: string | null
 address: string | null
 city: string | null
 state: string | null
 zip: string | null
 google_types: string[]
 place_id: string
}

const DISCOVERY_FIELD_MASK = [
 ...FIELD_MASK.split(','),
 'places.addressComponents',
 'nextPageToken',
].join(',')

export async function* discoverPlaces(
 query: string,
 opts?: { maxResults?: number },
): AsyncGenerator<PlaceDiscoveryResult, void, void> {
 const key = process.env.GOOGLE_PLACES_API_KEY
 if (!key) return
 if (!query) return

 const max = opts?.maxResults ?? 200
 let pageToken: string | null = null
 let yielded = 0
 const seenIds = new Set<string>()

 while (yielded < max) {
  const body: Record<string, any> = {
   textQuery: query,
   maxResultCount: 20,
   regionCode: 'US',
   languageCode: 'en',
  }
  if (pageToken) body.pageToken = pageToken

  let res: Response
  try {
   res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
     'X-Goog-Api-Key': key,
     'X-Goog-FieldMask': DISCOVERY_FIELD_MASK,
    },
    body: JSON.stringify(body),
   })
  } catch (e) {
   logger.warn('Places discovery threw', {
    error: e instanceof Error ? e.message : 'Unknown', query,
   })
   return
  }

  if (!res.ok) {
   const txt = await res.text().catch(() => '')
   logger.warn('Places discovery failed', { status: res.status, body: txt.slice(0, 300), query })
   return
  }

  const data = await res.json()
  const places: any[] = Array.isArray(data?.places) ? data.places : []
  for (const p of places) {
   if (yielded >= max) break
   if (p?.id && seenIds.has(p.id)) continue
   if (p?.id) seenIds.add(p.id)

   const addr: string = p.formattedAddress || ''
   if (!isTexasAddress(addr)) continue

   const components = extractAddressComponents(p.addressComponents)

   yield {
    business_name: p.displayName?.text || 'Unknown',
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || null,
    website: p.websiteUri || null,
    address: addr || null,
    city: components.city,
    state: components.state || 'TX',
    zip: components.zip,
    google_types: Array.isArray(p.types) ? p.types : [],
    place_id: p.id || '',
   }
   yielded++
  }

  pageToken = data?.nextPageToken || null
  if (!pageToken) break
  // Google requires a brief wait before the next page is queryable.
  await new Promise((r) => setTimeout(r, 1500))
 }
}

function extractAddressComponents(components: any[]): { city: string | null; state: string | null; zip: string | null } {
 if (!Array.isArray(components)) return { city: null, state: null, zip: null }
 let city: string | null = null
 let state: string | null = null
 let zip: string | null = null
 for (const c of components) {
  const types: string[] = c?.types || []
  const name: string = c?.shortText || c?.longText || ''
  if (!name) continue
  if (types.includes('locality') && !city) city = name
  if (types.includes('postal_town') && !city) city = name
  if (types.includes('administrative_area_level_1') && !state) state = name
  if (types.includes('postal_code') && !zip) zip = name
 }
 return { city, state, zip }
}
