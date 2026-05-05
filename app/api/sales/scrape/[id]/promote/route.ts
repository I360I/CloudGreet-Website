import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { promoteScrapeResults } from '@/lib/scrapers/promote'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/scrape/[id]/promote  { result_ids?: string[] }
 *
 * Manual promote button. Most rep scrapes auto-promote at the end
 * of the runner — this endpoint exists as a fallback in case
 * something failed mid-job, or for re-promote after admin tweaks.
 *
 * Auth: caller must own the scrape job (params.rep_id matches).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: job } = await supabaseAdmin
    .from('scrape_jobs').select('params').eq('id', params.id).maybeSingle()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.params?.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your job' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({} as { result_ids?: string[] }))
  const result = await promoteScrapeResults({
    jobId: params.id,
    repId: auth.userId,
    resultIds: Array.isArray(body.result_ids) && body.result_ids.length > 0
      ? body.result_ids.map(String)
      : undefined,
  })

  return NextResponse.json({
    success: true,
    promoted: result.promoted,
    skipped: result.reused, // legacy field name in the rep UI
    claimed: result.claimed,
    failed: result.failed,
    ...(result.first_error ? { error_sample: result.first_error } : {}),
  })
}
