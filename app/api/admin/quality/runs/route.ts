import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/quality/runs
 *
 * Returns the most recent prompt-eval runs (newest first, 20 max),
 * including summary metrics so the admin index can render a list +
 * trend at a glance. Detailed per-pair results live at
 * /api/admin/quality/runs/[id].
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('id, started_at, finished_at, status, generator_sha, total_pairs, completed_pairs, overall_score, expectation_pass_rate, category_averages, cost_micro, last_progress_at, notes')
    .order('started_at', { ascending: false })
    .limit(20)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ runs: data || [] })
}
