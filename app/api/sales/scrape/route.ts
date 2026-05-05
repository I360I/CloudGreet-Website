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
 * Sales-rep proxy for the scraper. The rep's lead_scrape_limit
 * (default 200) is treated as a *daily* total - we sum results_count
 * across all of the rep's scrape_jobs created today and cap any new
 * scrape to whatever's left. When the cap is hit reps see a "Request
 * more" link that pings Anthony.
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
  return data?.lead_scrape_limit ?? 200
}

async function getDailyUsed(userId: string): Promise<number> {
  // Sum results_count across today's jobs for this rep. We use
  // params->>rep_id (jsonb) for the filter - same shape as how we
  // tag jobs on insert.
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { data } = await supabaseAdmin
    .from('scrape_jobs')
    .select('results_count')
    .eq('params->>rep_id', userId)
    .gte('created_at', startOfDay.toISOString())
  let used = 0
  for (const row of data || []) used += row.results_count || 0
  return used
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

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
        error: 'scrape_jobs table missing - run sql/scraper.sql in Supabase.',
        migration_required: true,
      }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const [dailyLimit, dailyUsed] = await Promise.all([
    getRepLimit(auth.userId),
    getDailyUsed(auth.userId),
  ])
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed)

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
    daily_limit: dailyLimit,
    daily_used: dailyUsed,
    daily_remaining: dailyRemaining,
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

  const [dailyLimit, dailyUsed] = await Promise.all([
    getRepLimit(auth.userId),
    getDailyUsed(auth.userId),
  ])
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed)

  if (dailyRemaining <= 0) {
    return NextResponse.json({
      error: `Daily cap reached (${dailyLimit}/day). Use the "Request more" button or try again tomorrow.`,
      daily_limit: dailyLimit,
      daily_used: dailyUsed,
      daily_remaining: 0,
    }, { status: 429 })
  }

  const requested = typeof body.limit === 'number' ? body.limit : 100
  const limit = Math.min(dailyRemaining, Math.max(1, requested))

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

  return NextResponse.json({ success: true, job: finalJob || job, daily_limit: dailyLimit })
}
