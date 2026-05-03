import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { SCRAPER_SOURCES, getSource } from '@/lib/scrapers/registry'
import { runScrapeJob } from '@/lib/scrapers/runner'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // up to 5 min on Pro; harmless on Hobby

/* ------------------------------- GET ------------------------------- */

export async function GET(request: NextRequest) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: jobs, error } = await supabaseAdmin
   .from('scrape_jobs')
   .select('*')
   .order('created_at', { ascending: false })
   .limit(100)

  if (error) {
   if (/Could not find the table|does not exist/.test(error.message)) {
    return NextResponse.json({
     success: false,
     error: 'scrape_jobs table missing — run sql/scraper.sql in Supabase.',
     migration_required: true,
    }, { status: 500 })
   }
   return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
   success: true,
   jobs: jobs || [],
   sources: SCRAPER_SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
    trade: s.trade,
   })),
  })
 } catch (e) {
  logger.error('scrape GET failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 })
 }
}

/* ------------------------------- POST ------------------------------ */

export async function POST(request: NextRequest) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const sourceId = String(body.source || '').trim()
  const source = getSource(sourceId)
  if (!source) return NextResponse.json({ error: 'Unknown source' }, { status: 400 })

  const params = {
   location: body.location ? String(body.location).trim().slice(0, 100) : undefined,
   limit: typeof body.limit === 'number' ? Math.min(2000, Math.max(1, body.limit)) : 100,
   extra: body.extra && typeof body.extra === 'object' ? body.extra : undefined,
  }

  // Create the job row first so the UI can poll status while it runs.
  const { data: job, error: insertErr } = await supabaseAdmin
   .from('scrape_jobs')
   .insert({ source: sourceId, params, status: 'queued' })
   .select('*')
   .single()

  if (insertErr || !job) {
   return NextResponse.json({ error: insertErr?.message || 'Failed to create job' }, { status: 500 })
  }

  // Run synchronously inside the function timeout. The runner streams
  // results into scrape_results as it goes, so partial progress survives.
  try {
   await runScrapeJob(job.id)
  } catch (e) {
   logger.warn('Scrape job ended with error', { jobId: job.id, error: e instanceof Error ? e.message : 'Unknown' })
   // The runner has already stamped the row with status=failed.
  }

  // Return the up-to-date job row.
  const { data: finalJob } = await supabaseAdmin
   .from('scrape_jobs').select('*').eq('id', job.id).single()

  return NextResponse.json({ success: true, job: finalJob || job })
 } catch (e) {
  logger.error('scrape POST failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to start job' }, { status: 500 })
 }
}
