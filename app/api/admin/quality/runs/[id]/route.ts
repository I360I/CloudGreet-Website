import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/quality/runs/[id]
 *
 * One run plus all its per-pair results. Used by the drilldown view.
 * Also looks up the PREVIOUS run (any status='completed' that finished
 * before this one's started_at) and returns its overall_score +
 * category_averages so the UI can render score deltas without a
 * second round-trip.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: run, error: runErr } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('id, started_at, finished_at, status, generator_sha, total_pairs, completed_pairs, overall_score, expectation_pass_rate, category_averages, cost_micro, last_progress_at, meta, notes, prompts_cache, analysis, analyzed_at, analysis_cost_micro')
    .eq('id', params.id)
    .maybeSingle()
  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 500 })
  }
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const { data: results, error: resErr } = await supabaseAdmin
    .from('prompt_eval_results')
    .select('id, business_id, scenario_id, overall_score, expectation_pass, expectation_notes, scores, transcript, tool_calls, stop_reason, cost_micro, created_at')
    .eq('run_id', params.id)
    .order('created_at', { ascending: true })
  if (resErr) {
    return NextResponse.json({ error: resErr.message }, { status: 500 })
  }

  // Previous completed run for delta comparisons. Ignore runs still
  // in flight - their numbers aren't stable.
  const { data: prev } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('id, started_at, overall_score, expectation_pass_rate, category_averages, generator_sha, cost_micro')
    .eq('status', 'completed')
    .lt('started_at', (run as any).started_at)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // For client-mode runs there's exactly one business prompt - surface
  // it at the top of the payload so the UI doesn't have to dig into
  // prompts_cache JSON.
  const meta = ((run as any)?.meta || {}) as Record<string, any>
  let clientPrompt: string | null = null
  if (meta?.source === 'client' && meta?.client_fixture?.id) {
    const cache = ((run as any)?.prompts_cache || {}) as Record<string, string>
    clientPrompt = cache[meta.client_fixture.id] || null
  }
  // Don't ship the full prompts_cache - synthetic runs have 8 prompts
  // at ~10KB each, that's wasted bytes.
  const { prompts_cache, ...runWithoutCache } = run as any

  return NextResponse.json({
    run: runWithoutCache,
    previous: prev || null,
    results: results || [],
    client_prompt: clientPrompt,
  })
}
