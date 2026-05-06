/**
 * Build the "Business Context Document" the doc describes.
 *
 * Pulls from three layers, in priority order:
 *   1) the close + business rows (rep-supplied facts)
 *   2) Google Places (verified hours, reviews, address)
 *   3) the website scrape (services, copy tone, FAQs)
 *
 * Whichever layer fires first wins each field. Reasoning: rep-entered
 * data is the most trustworthy, then Google (verified by the owner),
 * then unstructured web copy (might be a stale About page).
 *
 * Output is a typed object the generator + validator both consume.
 */

import { scrapeWebsiteForAgent, type WebsiteScrape } from './scrape'
import { lookupGooglePlaces, type PlacesResult } from './google-places'

export type BusinessContext = {
  business: {
    name: string
    owner_name?: string
    phone?: string
    address?: string
    website?: string
    categories?: string[]
    service_area?: string[]
    hours?: Record<string, string> | null
  }
  services: {
    offered: string[]
    not_offered: string[]
    /** Free-form pulled from H1/H2/page text we couldn't parse cleanly. */
    raw_hints: string[]
  }
  pricing: {
    displays_pricing: boolean
    free_estimates_hint?: boolean
    notes: string[]
  }
  tone: {
    formality: 'formal' | 'casual' | 'friendly-professional' | 'unknown'
    review_keywords: string[]
    style_notes: string[]
  }
  reviews: {
    rating?: number
    count?: number
    samples: Array<{ author?: string | null; rating?: number; text?: string }>
  }
  /** Raw payloads for the admin-side audit drawer. */
  sources: {
    website?: WebsiteScrape
    google?: PlacesResult
  }
  errors: string[]
}

export async function buildBusinessContext(input: {
  /** From closes / businesses tables - the most trustworthy facts. */
  seed: {
    business_name: string
    owner_name?: string | null
    phone?: string | null
    address?: string | null
    website?: string | null
    services?: string[] | null
    business_hours?: any
    city_state_hint?: string | null
  }
}): Promise<BusinessContext> {
  const errors: string[] = []
  const seed = input.seed

  const websitePromise = seed.website
    ? scrapeWebsiteForAgent(seed.website).catch((e) => {
        errors.push(`website: ${e instanceof Error ? e.message : 'failed'}`)
        return null
      })
    : Promise.resolve(null)

  const placesQuery = [seed.business_name, seed.address || seed.city_state_hint]
    .filter(Boolean).join(', ')
  const placesPromise = placesQuery
    ? lookupGooglePlaces({ query: placesQuery }).catch((e) => {
        errors.push(`places: ${e instanceof Error ? e.message : 'failed'}`)
        return null
      })
    : Promise.resolve(null)

  const [website, google] = await Promise.all([websitePromise, placesPromise])
  if (website && !website.ok) errors.push(...website.errors.slice(0, 3))
  if (google && !google.ok && google.error) errors.push(`places: ${google.error}`)

  // ---------- business core ----------
  const phone =
    seed.phone ||
    google?.national_phone ||
    google?.international_phone ||
    website?.signals.phones?.[0]

  const address = seed.address || google?.formatted_address
  const websiteUrl = seed.website || google?.website_uri
  const hours = normaliseHoursToMap(seed.business_hours) || google?.opening_hours || null
  const categories = google?.types || (google?.primary_type ? [google.primary_type] : [])

  // ---------- services ----------
  const offered: string[] = []
  if (Array.isArray(seed.services)) for (const s of seed.services) {
    if (typeof s === 'string' && s.trim()) offered.push(s.trim())
  }
  // Pull obvious "Services we offer" / H2 headings from the website if we
  // didn't have explicit ones.
  const rawHints: string[] = []
  if (website?.ok) {
    for (const p of website.pages) {
      for (const h of p.h1.concat(p.h2)) {
        if (looksLikeServiceLine(h)) rawHints.push(h)
      }
    }
  }
  if (offered.length === 0) {
    // Promote rawHints into offered if nothing else is set, so the agent
    // has *something* to talk about. Generator still treats these as
    // tentative and won't promise them.
    for (const h of rawHints.slice(0, 8)) offered.push(h)
  }

  // ---------- pricing ----------
  const pricingNotes: string[] = []
  if (website?.ok) {
    for (const p of website.pages) {
      const t = p.text.toLowerCase()
      if (/\bfree\s+estimate/.test(t)) pricingNotes.push('Mentions free estimates')
      if (/\b(?:starting\s+at|from)\s+\$\d/.test(t)) pricingNotes.push('Has visible pricing language')
    }
  }
  const displaysPricing = pricingNotes.some((n) => /pricing language/i.test(n))
  const freeEstimatesHint = pricingNotes.some((n) => /free estimates/i.test(n)) || undefined

  // ---------- tone ----------
  const reviewKeywords = google?.review_keywords?.slice(0, 8) || []
  const styleNotes: string[] = []
  let formality: BusinessContext['tone']['formality'] = 'unknown'
  if (website?.ok) {
    const sample = website.pages.map((p) => p.text).join('\n').toLowerCase()
    if (/y'all|family[-\s]?owned|family[-\s]?run/.test(sample)) {
      formality = 'casual'
      styleNotes.push("Casual / family-owned voice (uses 'y'all' or family-business framing)")
    } else if (/\bcertified\b|\baccredited\b|\blicensed\b/.test(sample) && !/y'all/.test(sample)) {
      formality = 'friendly-professional'
      styleNotes.push('Trust-credentialed copy (licensed / accredited mentioned)')
    }
  }

  // ---------- reviews ----------
  const reviews = {
    rating: google?.rating,
    count: google?.user_rating_count,
    samples: (google?.reviews || []).slice(0, 5).map((r) => ({
      author: r.author,
      rating: r.rating,
      text: r.text,
    })),
  }

  return {
    business: {
      name: seed.business_name,
      owner_name: seed.owner_name || undefined,
      phone: phone || undefined,
      address: address || undefined,
      website: websiteUrl || undefined,
      categories,
      service_area: extractServiceArea(website, seed.city_state_hint || undefined),
      hours,
    },
    services: {
      offered,
      not_offered: [],
      raw_hints: rawHints.slice(0, 12),
    },
    pricing: {
      displays_pricing: displaysPricing,
      free_estimates_hint: freeEstimatesHint,
      notes: dedupe(pricingNotes),
    },
    tone: {
      formality,
      review_keywords: reviewKeywords,
      style_notes: styleNotes,
    },
    reviews,
    sources: {
      website: website || undefined,
      google: google || undefined,
    },
    errors,
  }
}

// ---------------- helpers ----------------

function normaliseHoursToMap(raw: any): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null
  // Already a {mon: "...", tue: "..."} shape
  const keys = Object.keys(raw)
  const dayKeys = keys.filter((k) => /^(mon|tue|wed|thu|fri|sat|sun)/i.test(k))
  if (dayKeys.length >= 3) {
    const out: Record<string, string> = {}
    for (const k of dayKeys) {
      const v = raw[k]
      if (typeof v === 'string') out[k.toLowerCase().slice(0, 3)] = v
      else if (v && typeof v === 'object') {
        if (v.closed) out[k.toLowerCase().slice(0, 3)] = 'Closed'
        else if (v.open && v.close) out[k.toLowerCase().slice(0, 3)] = `${v.open} - ${v.close}`
      }
    }
    return Object.keys(out).length ? out : null
  }
  return null
}

function looksLikeServiceLine(s: string): boolean {
  if (s.length < 3 || s.length > 80) return false
  if (/welcome|home|about us|contact us|call us|book now|get a quote/i.test(s)) return false
  // Likely a service if it's a noun-y phrase, especially industry-typical words.
  return /repair|install|service|maintenance|cleaning|inspection|estimate|tune[-\s]?up|replacement|emergency|consultation|treatment|exam|cleaning|tuning|tune/i.test(s)
}

function extractServiceArea(
  website: WebsiteScrape | null,
  hint: string | undefined,
): string[] | undefined {
  const areas: string[] = []
  if (hint) areas.push(hint)
  if (website?.ok) {
    const blob = website.pages.map((p) => p.text).join('\n')
    // Crude: "serving X, Y, and Z" / "we serve X" patterns.
    const m = blob.match(/(?:serving|service area|we serve|proudly serve(?:ing)?)\s*[:\-]?\s*([^\n.]{3,200})/i)
    if (m) {
      const list = m[1].split(/[,;&]| and /).map((s) => s.trim()).filter((s) => s && s.length < 40)
      for (const a of list) if (!areas.includes(a)) areas.push(a)
    }
  }
  return areas.length ? areas.slice(0, 8) : undefined
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr))
}
