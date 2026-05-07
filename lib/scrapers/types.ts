/**
 * Shared shapes for scraper sources.
 *
 * Every source is a function that takes a `ScrapeParams` and returns a
 * stream of `ScrapeRecord`s via an async generator. The job runner
 * persists records as they arrive so partial results survive timeouts.
 */

export type ScrapeRecord = {
 source: string
 business_name: string
 owner_name?: string | null
 phone?: string | null
 email?: string | null
 business_type?: string | null
 license_no?: string | null
 address?: string | null
 city?: string | null
 state?: string | null
 zip?: string | null
 website?: string | null
 raw: Record<string, unknown>
}

export type ScrapeParams = {
 // Free-text city / county / zip filter applied by the source where supported.
 location?: string
 // Soft cap on results so an admin can preview a small sample before a big run.
 limit?: number
 // Source-specific extras, passed through unchanged.
 extra?: Record<string, unknown>
}

/**
 * Optional dedupe context the runner hands to a source so it can keep
 * paginating past records the runner would drop anyway. Without this,
 * a Google text-search source happily yields its capped 60 results
 * and the runner drops 50 of them as dupes - leaving 10 fresh leads
 * out of a requested 50. Sources that respect this set ask Google for
 * more pages / more cities until they find `limit` UNSEEN records.
 */
export type SeenSets = {
  phones: Set<string>       // already-normalized via normalizePhone
  websites: Set<string>     // already-normalized via normalizeWebsite
  placeIds: Set<string>
  nameKeys: Set<string>     // already-normalized via businessNameKey
}

export type SourceRunOpts = {
  signal?: AbortSignal
  seen?: SeenSets
}

export type SourceDefinition = {
 id: string
 label: string
 description: string
 trade: 'HVAC' | 'Electrical' | 'Plumbing' | 'Pest Control' | 'Roofing' | 'Painting' | 'Handyman' | 'Landscaping' | 'Law'
 run: (params: ScrapeParams, opts: SourceRunOpts) => AsyncGenerator<ScrapeRecord, void, void>
}
