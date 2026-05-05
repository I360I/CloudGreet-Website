import { supabaseAdmin } from '../supabase'
import { logger } from '../monitoring'
import { getSource } from './registry'
import { promoteScrapeResults } from './promote'
import type { ScrapeParams, ScrapeRecord } from './types'

const RESULT_BATCH = 25

/**
 * Runs a scrape job synchronously: marks the job running, iterates the
 * source's async generator, batches inserts into scrape_results, and
 * stamps the final job row. Returns the final results count.
 *
 * Cross-run dedupe: at the start we snapshot every phone already in
 * the `leads` table (and recent `scrape_results`) into in-memory Sets,
 * and skip any record whose phone (normalized) or place_id (when the
 * source is Google Places) is already known. Prevents the rep portal
 * from showing the same contractor twice across separate scrape runs.
 */
export async function runScrapeJob(jobId: string): Promise<void> {
 const { data: job, error: loadErr } = await supabaseAdmin
  .from('scrape_jobs')
  .select('*')
  .eq('id', jobId)
  .single()

 if (loadErr || !job) throw new Error(loadErr?.message || 'Job not found')

 const source = getSource(job.source)
 if (!source) {
  await markFailed(jobId, `Unknown source: ${job.source}`)
  return
 }

 await supabaseAdmin
  .from('scrape_jobs')
  .update({
   status: 'running',
   started_at: new Date().toISOString(),
   updated_at: new Date().toISOString(),
  })
  .eq('id', jobId)

 // Build the dedupe sets up front. We accept that very-large workspaces
 // (>50k leads) may incur a few-second startup cost - fine for a job
 // that takes 30-90s to run.
 const seenPhones = new Set<string>()
 const seenPlaceIds = new Set<string>()
 try {
  const { data: existingLeads } = await supabaseAdmin
   .from('leads')
   .select('phone')
   .not('phone', 'is', null)
   .limit(50_000)
  for (const row of existingLeads || []) {
   const p = normalizePhone(row.phone)
   if (p) seenPhones.add(p)
  }

  // Within scrape_results across the last 90d - catches "rescraping the
  // same listing" before it gets promoted, plus already-promoted ones.
  const ninetyAgo = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const { data: recentResults } = await supabaseAdmin
   .from('scrape_results')
   .select('phone, raw')
   .gte('created_at', ninetyAgo)
   .limit(50_000)
  for (const row of recentResults || []) {
   const p = normalizePhone(row.phone)
   if (p) seenPhones.add(p)
   const placeId = (row.raw as any)?.google_place_id || (row.raw as any)?.google_places?.place_id
   if (placeId) seenPlaceIds.add(String(placeId))
  }
 } catch (e) {
  logger.warn('dedupe snapshot failed (continuing without it)', {
   error: e instanceof Error ? e.message : 'Unknown', jobId,
  })
 }

 const params: ScrapeParams = (job.params || {}) as ScrapeParams
 let buffer: ScrapeRecord[] = []
 let count = 0
 let droppedDup = 0

 const flush = async () => {
  if (buffer.length === 0) return
  const rows = buffer.map((r) => ({
   job_id: jobId,
   source: r.source,
   business_name: r.business_name,
   owner_name: r.owner_name ?? null,
   phone: r.phone ?? null,
   email: r.email ?? null,
   business_type: r.business_type ?? null,
   license_no: r.license_no ?? null,
   address: r.address ?? null,
   city: r.city ?? null,
   state: r.state ?? null,
   zip: r.zip ?? null,
   website: r.website ?? null,
   raw: r.raw ?? {},
  }))
  const { error } = await supabaseAdmin.from('scrape_results').insert(rows)
  if (error) {
   logger.error('scrape_results insert failed', { error: error.message, jobId })
   throw error
  }
  count += rows.length
  buffer = []
  // Lightweight progress update
  await supabaseAdmin
   .from('scrape_jobs')
   .update({ results_count: count, updated_at: new Date().toISOString() })
   .eq('id', jobId)
 }

 try {
  for await (const record of source.run(params, {})) {
   const phone = normalizePhone(record.phone)
   const placeId = (record.raw as any)?.google_place_id

   if (phone && seenPhones.has(phone)) { droppedDup++; continue }
   if (placeId && seenPlaceIds.has(String(placeId))) { droppedDup++; continue }
   if (phone) seenPhones.add(phone)
   if (placeId) seenPlaceIds.add(String(placeId))

   buffer.push(record)
   if (buffer.length >= RESULT_BATCH) await flush()
  }
  await flush()

  // Auto-promote into leads when this scrape was run by a rep. This
  // skips the manual "Promote" step - results go straight into their
  // /sales/leads list with auto-claim. Idempotent: results that
  // already have a promoted_lead_id are skipped.
  const repId = (params as any)?.rep_id as string | undefined
  if (repId && count > 0) {
   try {
    const promoteResult = await promoteScrapeResults({ jobId, repId })
    logger.info('scrape auto-promote complete', {
     jobId, repId,
     ...promoteResult,
    })
   } catch (e) {
    logger.warn('scrape auto-promote threw (non-fatal)', {
     jobId, error: e instanceof Error ? e.message : 'Unknown',
    })
   }
  }

  await supabaseAdmin
   .from('scrape_jobs')
   .update({
    status: 'completed',
    results_count: count,
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
   })
   .eq('id', jobId)

  if (droppedDup > 0) {
   logger.info('scrape cross-run dedupe', {
    jobId, source: job.source, kept: count, droppedAsDuplicate: droppedDup,
   })
  }
 } catch (e) {
  await flush().catch(() => {})
  await markFailed(jobId, e instanceof Error ? e.message : 'Unknown error', count)
  throw e
 }
}

async function markFailed(jobId: string, error: string, count = 0) {
 await supabaseAdmin
  .from('scrape_jobs')
  .update({
   status: 'failed',
   error,
   results_count: count,
   finished_at: new Date().toISOString(),
   updated_at: new Date().toISOString(),
  })
  .eq('id', jobId)
}

function normalizePhone(p: string | null | undefined): string | null {
 if (!p) return null
 const digits = p.replace(/[^0-9]/g, '')
 if (!digits) return null
 if (digits.length === 10) return `+1${digits}`
 if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
 return null
}
