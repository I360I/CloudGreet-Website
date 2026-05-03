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

export function isGooglePlacesConfigured(): boolean {
 return !!process.env.GOOGLE_PLACES_API_KEY
}

export async function enrichWithGooglePlaces(
 businessName: string,
 city: string | null | undefined,
): Promise<PlacesEnrichment | null> {
 const key = process.env.GOOGLE_PLACES_API_KEY
 if (!key) return null
 if (!businessName) return null

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
   logger.warn('Google Places search failed', {
    status: res.status, body: body.slice(0, 500), query,
   })
   return null
  }

  const data = await res.json()
  const place = data?.places?.[0]
  if (!place) return null

  return {
   phone: place.internationalPhoneNumber || place.nationalPhoneNumber || null,
   website: place.websiteUri || null,
   google_types: Array.isArray(place.types) ? place.types : [],
   matched_name: place.displayName?.text || null,
   matched_address: place.formattedAddress || null,
   place_id: place.id || null,
  }
 } catch (e) {
  logger.warn('Google Places call threw', {
   error: e instanceof Error ? e.message : 'Unknown', query,
  })
  return null
 }
}
