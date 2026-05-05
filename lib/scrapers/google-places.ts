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
 'places.rating',
 'places.userRatingCount',
 'places.businessStatus',
].join(',')

/**
 * Hardcoded centers for the Texas metros we actually scrape. Avoids a
 * separate Geocoding API call. Add more as needed — keys are lowercased
 * for matching against user input. If a city isn't in the map, we fall
 * back to a Texas-wide rectangle for `locationBias`.
 */
export const TX_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
 austin:        { lat: 30.2672, lng: -97.7431 },
 houston:       { lat: 29.7604, lng: -95.3698 },
 dallas:        { lat: 32.7767, lng: -96.7970 },
 'fort worth':  { lat: 32.7555, lng: -97.3308 },
 'san antonio': { lat: 29.4241, lng: -98.4936 },
 'el paso':     { lat: 31.7619, lng: -106.4850 },
 arlington:     { lat: 32.7357, lng: -97.1081 },
 plano:         { lat: 33.0198, lng: -96.6989 },
 corpus:        { lat: 27.8006, lng: -97.3964 },
 'corpus christi': { lat: 27.8006, lng: -97.3964 },
 lubbock:       { lat: 33.5779, lng: -101.8552 },
 laredo:        { lat: 27.5306, lng: -99.4803 },
 garland:       { lat: 32.9126, lng: -96.6389 },
 irving:        { lat: 32.8140, lng: -96.9489 },
 amarillo:      { lat: 35.2220, lng: -101.8313 },
 frisco:        { lat: 33.1507, lng: -96.8236 },
 mckinney:      { lat: 33.1972, lng: -96.6398 },
 mesquite:      { lat: 32.7668, lng: -96.5992 },
 killeen:       { lat: 31.1171, lng: -97.7278 },
 waco:          { lat: 31.5493, lng: -97.1467 },
 denton:        { lat: 33.2148, lng: -97.1331 },
 midland:       { lat: 31.9974, lng: -102.0779 },
 abilene:       { lat: 32.4487, lng: -99.7331 },
 beaumont:      { lat: 30.0860, lng: -94.1018 },
 'round rock':  { lat: 30.5083, lng: -97.6789 },
 tyler:         { lat: 32.3513, lng: -95.3011 },
 'college station': { lat: 30.6280, lng: -96.3344 },
 pearland:      { lat: 29.5638, lng: -95.2861 },
 'sugar land':  { lat: 29.5994, lng: -95.6347 },
 lewisville:    { lat: 33.0462, lng: -96.9942 },
 league:        { lat: 29.5074, lng: -95.0949 },
 longview:      { lat: 32.5007, lng: -94.7405 },
 'cedar park':  { lat: 30.5052, lng: -97.8203 },
 conroe:        { lat: 30.3119, lng: -95.4561 },
 georgetown:    { lat: 30.6333, lng: -97.6779 },
 'san marcos':  { lat: 29.8833, lng: -97.9414 },
 pflugerville:  { lat: 30.4394, lng: -97.6200 },
 'new braunfels': { lat: 29.7030, lng: -98.1245 },
}

const TX_BOUNDS = {
 low:  { latitude: 25.84, longitude: -106.65 },
 high: { latitude: 36.50, longitude: -93.51 },
}

export function txCityCoords(city: string | null | undefined): { lat: number; lng: number } | null {
 if (!city) return null
 const k = city.trim().toLowerCase()
 if (!k) return null
 if (TX_CITY_COORDS[k]) return TX_CITY_COORDS[k]
 // Loose match: drop trailing ", TX" or " texas"
 const stripped = k.replace(/\s*,?\s*(tx|texas)\s*$/i, '').trim()
 return TX_CITY_COORDS[stripped] ?? null
}

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
 rating: number | null
 review_count: number | null
 business_status: string | null
}

const DISCOVERY_FIELD_MASK = [
 ...FIELD_MASK.split(','),
 'places.addressComponents',
 'nextPageToken',
].join(',')

export async function* discoverPlaces(
 query: string,
 opts?: {
  maxResults?: number
  /** Soft preference for results in this geographic area. */
  locationBias?: { lat: number; lng: number; radiusMeters?: number }
  /** Hard restriction — results outside are excluded. Mutually exclusive with bias. */
  locationRestriction?: { lat: number; lng: number; radiusMeters: number }
  /** Filter results by Google Place type (e.g. 'hvac_contractor'). */
  includedType?: string
  /** Drop results below this user-rating count (acts as a "ghost listing" filter). */
  minReviewCount?: number
  /** Drop results below this average star rating. */
  minRating?: number
  /** Drop results that are CLOSED_PERMANENTLY / CLOSED_TEMPORARILY (default true). */
  excludeClosed?: boolean
 },
): AsyncGenerator<PlaceDiscoveryResult, void, void> {
 const key = process.env.GOOGLE_PLACES_API_KEY
 if (!key) return
 if (!query) return

 const max = opts?.maxResults ?? 200
 const minReviews = opts?.minReviewCount ?? 0
 const minRating = opts?.minRating ?? 0
 const excludeClosed = opts?.excludeClosed !== false
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
  if (opts?.includedType) body.includedType = opts.includedType
  if (opts?.locationRestriction) {
   body.locationRestriction = {
    circle: {
     center: { latitude: opts.locationRestriction.lat, longitude: opts.locationRestriction.lng },
     radius: opts.locationRestriction.radiusMeters,
    },
   }
  } else if (opts?.locationBias) {
   body.locationBias = {
    circle: {
     center: { latitude: opts.locationBias.lat, longitude: opts.locationBias.lng },
     radius: opts.locationBias.radiusMeters ?? 50_000, // ~31 miles default
    },
   }
  } else {
   // Default to Texas rectangle so we never get out-of-state matches.
   body.locationBias = { rectangle: TX_BOUNDS }
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
   const reviewCount: number = typeof p.userRatingCount === 'number' ? p.userRatingCount : 0
   const rating: number = typeof p.rating === 'number' ? p.rating : 0
   const status: string = p.businessStatus || ''

   if (excludeClosed && /CLOSED/i.test(status)) continue
   if (reviewCount < minReviews) continue
   if (rating > 0 && rating < minRating) continue

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
    rating: rating || null,
    review_count: reviewCount,
    business_status: status || null,
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
