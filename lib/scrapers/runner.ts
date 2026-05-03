import { supabaseAdmin } from '../supabase'
import { logger } from '../monitoring'
import { getSource } from './registry'
import type { ScrapeParams, ScrapeRecord } from './types'

const RESULT_BATCH = 25

/**
 * Runs a scrape job synchronously: marks the job running, iterates the
 * source's async generator, batches inserts into scrape_results, and
 * stamps the final job row. Returns the final results count.
 *
 * Designed to fit inside a Vercel function invocation. For very large
 * pulls, run multiple smaller jobs (a job per city, etc) — the source
 * generators support a `limit` and a `location` param.
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
 let buffer: ScrapeRecord[] = []
 let count = 0

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
   buffer.push(record)
   if (buffer.length >= RESULT_BATCH) await flush()
  }
  await flush()

  await supabaseAdmin
   .from('scrape_jobs')
   .update({
    status: 'completed',
    results_count: count,
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
   })
   .eq('id', jobId)
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
