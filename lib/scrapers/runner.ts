import { supabaseAdmin } from '../supabase'
import { logger } from '../monitoring'
import { getSource } from './registry'
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

 const params: ScrapeParams = (job.params || {}) as ScrapeParams
 const repIdForSeen = (params as any)?.rep_id as string | undefined
 const seen = await loadSeenSets(repIdForSeen)
 const diag: import('./types').ScrapeDiag = {
  messages: [],
  push: (line) => {
   if (diag.messages.length < 50) diag.messages.push(line)
  },
 }
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
  for await (const record of source.run(params, { seen, diag })) {
   const phone = normalizePhone(record.phone)
   const website = normalizeWebsite(record.website)
   const placeId = (record.raw as any)?.google_place_id
   const nameKey = businessNameKey(record.business_name, record.city)

   // Hard gate: no phone = no lead. Reps can't cold-call without one.
   // Enforced at the runner so every source benefits even if its own
   // filter misses an edge case.
   if (!phone) { droppedDup++; continue }

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

  // No auto-promote. Reps should review the raw scrape_results first
  // and explicitly click Promote on the ones they actually want in their
  // leads list. The /api/sales/scrape/[id]/promote route handles the
  // manual path and the UI exposes a per-row + bulk promote button.

  // On completed-but-empty, surface diagnostics into the job's error
   // field so the rep can read it in the UI without checking Vercel logs.
   const completionError = count === 0
    ? buildEmptyJobReason(diag, droppedDup)
    : null

   await supabaseAdmin
    .from('scrape_jobs')
    .update({
     status: 'completed',
     results_count: count,
     finished_at: new Date().toISOString(),
     updated_at: new Date().toISOString(),
     ...(completionError ? { error: completionError } : {}),
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

function buildEmptyJobReason(
 diag: import('./types').ScrapeDiag,
 droppedDup: number,
): string {
 const lines: string[] = []
 lines.push(`No results. Dropped ${droppedDup} record(s) as duplicates / phone-less.`)
 if (!process.env.GOOGLE_PLACES_API_KEY) {
  lines.push('GOOGLE_PLACES_API_KEY is not set in this environment.')
 }
 if (diag.messages.length === 0) {
  lines.push('Source produced no diagnostics. Likely the source iterator yielded nothing (filtering or API error before yield).')
 } else {
  lines.push('--- source diagnostics (most recent) ---')
  for (const m of diag.messages.slice(-20)) lines.push(m)
 }
 return lines.join('\n').slice(0, 4000)
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
async function loadSeenSets(repId?: string): Promise<SeenSets> {
 const sets: SeenSets = {
  phones: new Set(),
  websites: new Set(),
  placeIds: new Set(),
  nameKeys: new Set(),
 }
 // Per-rep dedupe: only dedupe against leads THIS rep already has assigned
 // and scrape_results from THIS rep's prior jobs. The leads pool itself is
 // shared across reps - if rep A scraped a contractor last week, rep B
 // running the same scrape today should still see them. promote.ts handles
 // the actual leads-table dedupe (reuses the existing lead row and adds a
 // new lead_assignments row for rep B), so the runner shouldn't filter
 // them out before they reach promote.
 //
 // Without a repId we fall back to no dedupe - admin/test scrapes have to
 // cope with their own dupes downstream.
 if (!repId) return sets

 // Leads this rep is already assigned to. Two-step query so we don't need
 // a SQL join through the supabase client.
 try {
  const { data: assigns } = await supabaseAdmin
   .from('lead_assignments')
   .select('lead_id')
   .eq('rep_id', repId)
   .limit(50_000)
  const leadIds = (assigns || []).map((a) => a.lead_id).filter(Boolean)
  if (leadIds.length > 0) {
   // Chunk to avoid hitting the URL-length cap on .in() with 50k ids.
   const CHUNK = 1000
   for (let i = 0; i < leadIds.length; i += CHUNK) {
    const slice = leadIds.slice(i, i + CHUNK)
    const { data } = await supabaseAdmin
     .from('leads')
     .select('phone, website, business_name, city')
     .in('id', slice)
    for (const row of data || []) {
     const p = normalizePhone(row.phone)
     if (p) sets.phones.add(p)
     const w = normalizeWebsite(row.website)
     if (w) sets.websites.add(w)
     const k = businessNameKey(row.business_name, row.city)
     if (k) sets.nameKeys.add(k)
    }
   }
  }
 } catch (e) {
  logger.warn('seen-set load: rep leads failed', { error: e instanceof Error ? e.message : 'Unknown' })
 }

 // Scrape_results from THIS rep's prior jobs (last 30 days) - covers
 // in-flight rows that haven't promoted yet but are already targeted at
 // this rep so we don't double-yield within a short test cycle.
 try {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()
  // rep_id is stored inside params (jsonb) for scrape_jobs - filter by
  // params->>rep_id to find jobs this rep created.
  const { data: jobs } = await supabaseAdmin
   .from('scrape_jobs')
   .select('id')
   .gte('created_at', cutoff)
   .eq('params->>rep_id', repId)
   .limit(500)
  const jobIds = (jobs || []).map((j) => j.id).filter(Boolean)
  if (jobIds.length > 0) {
   const { data } = await supabaseAdmin
    .from('scrape_results')
    .select('phone, website, business_name, city, raw')
    .in('job_id', jobIds)
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
  }
 } catch (e) {
  logger.warn('seen-set load: rep scrape_results failed', { error: e instanceof Error ? e.message : 'Unknown' })
 }
 return sets
}
