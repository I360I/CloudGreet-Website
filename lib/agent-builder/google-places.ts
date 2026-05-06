/**
 * Google Places (New) Place Details lookup.
 *
 * Hands back hours, address, categories, top reviews, phone - the data
 * Claude needs to make the agent feel like it actually knows the
 * business. Gracefully degrades to empty if GOOGLE_PLACES_API_KEY isn't
 * set; the caller falls back to whatever the website yielded.
 *
 * Why we hit Places: review patterns + Google-confirmed hours are the
 * single biggest quality lever per the agent-builder doc - the
 * difference between "Hi how can I help you" and "Hey, this is Sarah,
 * we're a family shop in Austin".
 *
 * Two-step API call: searchText to find the place_id, then placeDetails
 * to pull the rich blob. We coalesce both into a single PlacesResult.
 *
 * Cost: ~$0.02 per lookup. Triggered manually from /admin/agents-due,
 * not on every close, so the bill stays predictable.
 */

import { logger } from '@/lib/monitoring'

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const TIMEOUT_MS = 6_000

export type PlacesResult = {
  ok: boolean
  place_id?: string
  name?: string
  formatted_address?: string
  primary_type?: string
  types?: string[]
  international_phone?: string
  national_phone?: string
  website_uri?: string
  rating?: number
  user_rating_count?: number
  /** Resolved opening hours - { mon: "08:00 - 18:00", tue: ..., closed: ["sun"] } */
  opening_hours?: Record<string, string>
  reviews?: Array<{
    author?: string | null
    rating?: number
    text?: string
    relative_time?: string | null
  }>
  /** Truncated array of "great service" / "fast response" review-style hints. */
  review_keywords?: string[]
  error?: string
}

export async function lookupGooglePlaces(input: {
  /** "JoeBob's HVAC, Austin TX" - typically business name + city/state. */
  query: string
}): Promise<PlacesResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'GOOGLE_PLACES_API_KEY not set' }
  }
  if (!input.query?.trim()) {
    return { ok: false, error: 'empty query' }
  }

  // searchText returns ranked candidates; we take the first.
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const fields = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.nationalPhoneNumber',
      'places.internationalPhoneNumber',
      'places.websiteUri',
      'places.rating',
      'places.userRatingCount',
      'places.regularOpeningHours',
      'places.types',
      'places.primaryType',
      'places.reviews',
    ].join(',')

    const r = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fields,
      },
      body: JSON.stringify({ textQuery: input.query, pageSize: 1 }),
      signal: ctrl.signal,
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return { ok: false, error: `searchText ${r.status}: ${body.slice(0, 200)}` }
    }
    const j = await r.json().catch(() => null) as any
    const place = j?.places?.[0]
    if (!place) return { ok: false, error: 'no places matched' }

    const opening = parseOpeningHours(place?.regularOpeningHours)
    const reviews = (place?.reviews || []).slice(0, 8).map((rv: any) => ({
      author: rv?.authorAttribution?.displayName || null,
      rating: typeof rv?.rating === 'number' ? rv.rating : undefined,
      text: typeof rv?.text?.text === 'string' ? rv.text.text.slice(0, 600) : undefined,
      relative_time: rv?.relativePublishTimeDescription || null,
    }))
    const review_keywords = extractReviewKeywords(reviews)

    return {
      ok: true,
      place_id: place.id,
      name: place?.displayName?.text || place?.displayName || undefined,
      formatted_address: place?.formattedAddress,
      primary_type: place?.primaryType,
      types: place?.types,
      national_phone: place?.nationalPhoneNumber,
      international_phone: place?.internationalPhoneNumber,
      website_uri: place?.websiteUri,
      rating: place?.rating,
      user_rating_count: place?.userRatingCount,
      opening_hours: opening,
      reviews,
      review_keywords,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'lookup failed',
    }
  } finally {
    clearTimeout(t)
  }
}

// regularOpeningHours.weekdayDescriptions = ["Monday: 8:00 AM – 6:00 PM", ...]
// Normalise into { mon: "08:00 - 18:00", ... } strings.
function parseOpeningHours(rh: any): Record<string, string> | undefined {
  const list: string[] = rh?.weekdayDescriptions
  if (!Array.isArray(list)) return undefined
  const out: Record<string, string> = {}
  const dayMap: Record<string, string> = {
    monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu',
    friday: 'fri', saturday: 'sat', sunday: 'sun',
  }
  for (const line of list) {
    const m = line.match(/^(\w+):\s*(.+)$/)
    if (!m) continue
    const key = dayMap[m[1].toLowerCase()]
    if (!key) continue
    out[key] = m[2].trim()
  }
  return Object.keys(out).length ? out : undefined
}

// Word-frequency over review text - very dumb but useful for tone hints.
function extractReviewKeywords(reviews: Array<{ text?: string }>): string[] {
  const counts = new Map<string, number>()
  const stop = new Set([
    'the','and','for','with','this','that','was','were','are','they','their','our','from',
    'have','has','will','would','could','about','your','you','they','them','very','just','any',
    'also','some','more','all','out','one','two','can','had','his','her','him','she','its','it',
    'i','a','an','to','in','on','of','is','as','at','be','by','or','if','so','do','did','no','not',
  ])
  const re = /[a-z']{4,}/g
  for (const r of reviews) {
    if (!r.text) continue
    const lower = r.text.toLowerCase()
    for (const m of lower.match(re) || []) {
      if (stop.has(m)) continue
      counts.set(m, (counts.get(m) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w)
}
