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

export type SourceDefinition = {
 id: string
 label: string
 description: string
 trade: 'HVAC' | 'Electrical' | 'Plumbing' | 'Pest Control'
 run: (params: ScrapeParams, opts: { signal?: AbortSignal }) => AsyncGenerator<ScrapeRecord, void, void>
}
