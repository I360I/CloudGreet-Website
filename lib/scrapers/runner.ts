import { supabaseAdmin } from '../supabase'
import { logger } from '../monitoring'
import { getSource } from './registry'
import { promoteScrapeResults } from './promote'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import type { ScrapeParams, ScrapeRecord, SeenSets } from './types'

const RESULT_BATCH = 25

/**
 * Runs a scrape job synchronously. Persists records as they arrive so
 * partial results survive timeouts.
 *
 * Cross-run dedupe (the reason this file got rebuilt):
 *
 *   At job start we snapshot every known phone, website, place_id, and
 *   business-name|city key from `leads` and the last 180 days of
 *   `scrape_results`, then hand them to the source as `opts.seen`.
 *
 *   Sources that respect `opts.seen` (Google Places-backed ones) page
 *   past records they'd lose to dedupe instead of stopping at the
 *   first ~60 - so the rep actually gets the `limit` they asked for.
 *
 *   The runner re-applies the dedupe before persisting, so even sources
 *   that ignore `opts.seen` (license databases) still don't write
 *   duplicates.
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

 const seen = await loadSeenSets()

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
  // Lightweight progress update.
  await supabaseAdmin
   .from('scrape_jobs')
   .update({ results_count: count, updated_at: new Date().toISOString() })
   .eq('id', jobId)
 }

 try {
  for await (const record of source.run(params, { seen })) {
   const phone = normalizePhone(record.phone)
   const website = normalizeWebsite(record.website)
   const placeId = (record.raw as any)?.google_place_id
   const nameKey = businessNameKey(record.business_name, record.city)

   // Dedupe ladder: phone > placeId > website > name+city.
   if (phone && seen.phones.has(phone)) { droppedDup++; continue }
   if (placeId && seen.placeIds.has(String(placeId))) { droppedDup++; continue }
   if (website && seen.websites.has(website)) { droppedDup++; continue }
   if (nameKey && seen.nameKeys.has(nameKey)) { droppedDup++; continue }

   if (phone) seen.phones.add(phone)
   if (placeId) seen.placeIds.add(String(placeId))
   if (website) seen.websites.add(website)
   if (nameKey) seen.nameKeys.add(nameKey)

   buffer.push(record)
   if (buffer.length >= RESULT_BATCH) await flush()
  }
  await flush()

  // Auto-promote into leads when this scrape was run by a rep.
  const repId = (params as any)?.rep_id as string | undefined
  if (repId && count > 0) {
   try {
    const promoteResult = await promoteScrapeResults({ jobId, repId })
    logger.info('scrape auto-promote complete', { jobId, repId, ...promoteResult })
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

/**
 * Build the seen-sets snapshot. Best-effort: if any one query fails we
 * fall back to whatever we did manage to load. A degraded seen-set
 * means more dupes get caught downstream by the in-loop check, so
 * this is safe.
 */
async function loadSeenSets(): Promise<SeenSets> {
 const sets: SeenSets = {
  phones: new Set(),
  websites: new Set(),
  placeIds: new Set(),
  nameKeys: new Set(),
 }
 // Leads - the canonical "already imported" list.
 try {
  const { data } = await supabaseAdmin
   .from('leads')
   .select('phone, website, business_name, city')
   .limit(50_000)
  for (const row of data || []) {
   const p = normalizePhone(row.phone)
   if (p) sets.phones.add(p)
   const w = normalizeWebsite(row.website)
   if (w) sets.websites.add(w)
   const k = businessNameKey(row.business_name, row.city)
   if (k) sets.nameKeys.add(k)
  }
 } catch (e) {
  logger.warn('seen-set load: leads failed', { error: e instanceof Error ? e.message : 'Unknown' })
 }
 // Recent scrape_results - covers in-flight (not-yet-promoted) hits and
 // older promoted ones so we don't re-show the same lead.
 try {
  const cutoff = new Date(Date.now() - 180 * 86_400_000).toISOString()
  const { data } = await supabaseAdmin
   .from('scrape_results')
   .select('phone, website, business_name, city, raw')
   .gte('created_at', cutoff)
   .limit(50_000)
  for (const row of data || []) {
   const p = normalizePhone(row.phone)
   if (p) sets.phones.add(p)
   const w = normalizeWebsite(row.website)
   if (w) sets.websites.add(w)
   const k = businessNameKey(row.business_name, row.city)
   if (k) sets.nameKeys.add(k)
   const placeId = (row.raw as any)?.google_place_id || (row.raw as any)?.google_places?.place_id
   if (placeId) sets.placeIds.add(String(placeId))
  }
 } catch (e) {
  logger.warn('seen-set load: scrape_results failed', { error: e instanceof Error ? e.message : 'Unknown' })
 }
 return sets
}
