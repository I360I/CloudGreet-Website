import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { SCRAPER_SOURCES, getSource } from '@/lib/scrapers/registry'
import { runScrapeJob } from '@/lib/scrapers/runner'
import { isGooglePlacesConfigured } from '@/lib/scrapers/google-places'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Sales-rep proxy for the scraper. Same surface as /api/admin/scrape
 * but with a per-rep cap (sales_reps.lead_scrape_limit, default 100).
 * Admin can raise the cap in the rep's profile.
 *
 * Jobs created by reps are tagged with rep_id in params so we can
 * filter the listing on this side.
 */

async function getRepLimit(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('sales_reps')
    .select('lead_scrape_limit')
    .eq('id', userId)
    .maybeSingle()
  return data?.lead_scrape_limit ?? 100
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Filter to jobs this rep created. We tag params.rep_id on insert.
  const { data: jobs, error } = await supabaseAdmin
    .from('scrape_jobs')
    .select('*')
    .eq('params->>rep_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(50)

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

  const limit = await getRepLimit(auth.userId)

  return NextResponse.json({
    success: true,
    jobs: jobs ?? [],
    sources: SCRAPER_SOURCES.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      trade: s.trade,
    })),
    enrichment: { google_places: isGooglePlacesConfigured() },
    rep_scrape_limit: limit,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const sourceId = String(body.source || '').trim()
  const source = getSource(sourceId)
  if (!source) return NextResponse.json({ error: 'Unknown source' }, { status: 400 })

  const repLimit = await getRepLimit(auth.userId)
  const requested = typeof body.limit === 'number' ? body.limit : 100
  const limit = Math.min(repLimit, Math.max(1, requested))

  const params = {
    rep_id: auth.userId,
    location: body.location ? String(body.location).trim().slice(0, 100) : undefined,
    limit,
    extra: body.extra && typeof body.extra === 'object' ? body.extra : undefined,
  }

  const { data: job, error: insertErr } = await supabaseAdmin
    .from('scrape_jobs')
    .insert({ source: sourceId, params, status: 'queued' })
    .select('*')
    .single()

  if (insertErr || !job) {
    return NextResponse.json({ error: insertErr?.message || 'Failed to create job' }, { status: 500 })
  }

  try {
    await runScrapeJob(job.id)
  } catch (e) {
    logger.warn('Sales scrape job ended with error', {
      jobId: job.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  const { data: finalJob } = await supabaseAdmin
    .from('scrape_jobs')
    .select('*')
    .eq('id', job.id)
    .single()

  return NextResponse.json({ success: true, job: finalJob || job })
}
