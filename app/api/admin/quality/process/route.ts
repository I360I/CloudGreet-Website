import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { loadBusinesses, loadScenarios, loadRubric } from '@/scripts/prompt-research/lib/load'
import { generateFullPromptForBusiness } from '@/scripts/prompt-research/lib/generate'
import { processPair } from '@/scripts/prompt-research/lib/run-pair'
import type { BusinessFixture, ScenarioFixture } from '@/scripts/prompt-research/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/admin/quality/process { run_id }
 *
 * Pulls the next pending pair off the run's `pending_matrix`, processes
 * it (generate prompt if not cached, simulate, score), inserts the
 * result, decrements the pending matrix, and fires off the NEXT
 * /process call to keep the chain going.
 *
 * Two-pair batch per invocation to stay comfortably under Vercel's
 * 60s function cap. Each pair ~20-35s typical.
 *
 * Safety:
 *   - if run.status != 'running' we no-op (handles cancellation)
 *   - if pending_matrix is empty we mark completed and stop
 *   - any error inside a pair is caught and recorded as a 0-score
 *     stub so the chain doesn't die on one bad pair
 */

const PAIRS_PER_INVOCATION = 2

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { run_id?: string }
  const runId = body.run_id
  if (!runId) return NextResponse.json({ error: 'run_id required' }, { status: 400 })

  const { data: run, error: runErr } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('id, status, pending_matrix, prompts_cache, total_pairs, completed_pairs')
    .eq('id', runId)
    .maybeSingle()
  if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 })
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  if ((run as any).status !== 'running') {
    return NextResponse.json({ ok: true, status: (run as any).status, message: 'Run not in running state - no-op' })
  }

  const pending: Array<{ business_id: string; scenario_id: string }> =
    Array.isArray((run as any).pending_matrix) ? (run as any).pending_matrix : []
  const promptsCache: Record<string, string> =
    typeof (run as any).prompts_cache === 'object' && (run as any).prompts_cache
      ? (run as any).prompts_cache
      : {}

  if (pending.length === 0) {
    await finalizeRun(runId)
    return NextResponse.json({ ok: true, done: true })
  }

  const businesses = loadBusinesses()
  const scenarios = loadScenarios()
  const rubric = loadRubric()
  const bizMap = new Map(businesses.map((b) => [b.id, b]))
  const scnMap = new Map(scenarios.map((s) => [s.id, s]))

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    await markRunFailed(runId, 'ANTHROPIC_API_KEY is missing on the server.')
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }
  const client = new Anthropic({ apiKey })

  const toProcess = pending.slice(0, PAIRS_PER_INVOCATION)
  const remaining = pending.slice(PAIRS_PER_INVOCATION)

  for (const p of toProcess) {
    const business = bizMap.get(p.business_id)
    const scenario = scnMap.get(p.scenario_id)
    if (!business || !scenario) {
      await insertErrorResult(runId, p.business_id, p.scenario_id, 'fixture missing on disk')
      continue
    }

    // Generate the agent prompt once per business and cache on the run row.
    // Track the generation cost separately so we can attribute it to the
    // FIRST pair for this business (we only generate once, but the cost is
    // real and should land somewhere).
    let agentPrompt = promptsCache[business.id]
    let generationCostMicro = 0
    if (!agentPrompt) {
      try {
        const gen = await generateFullPromptForBusiness(business)
        agentPrompt = gen.prompt
        generationCostMicro = gen.cost_micro
        promptsCache[business.id] = agentPrompt
        await supabaseAdmin
          .from('prompt_eval_runs')
          .update({ prompts_cache: promptsCache, last_progress_at: new Date().toISOString() })
          .eq('id', runId)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        logger.warn('quality: generate failed', { runId, businessId: business.id, error: msg })
        await insertErrorResult(runId, business.id, scenario.id, `generate failed: ${msg}`, 0)
        continue
      }
    }

    try {
      const scored = await processPair(client, agentPrompt, rubric, business, scenario, {
        extraCostMicro: generationCostMicro,
      })
      await supabaseAdmin.from('prompt_eval_results').insert({
        run_id: runId,
        business_id: scored.business_id,
        scenario_id: scored.scenario_id,
        overall_score: scored.overall,
        expectation_pass: scored.expectation_pass,
        expectation_notes: scored.expectation_notes,
        scores: scored.scores,
        transcript: scored.transcript,
        tool_calls: scored.tool_calls,
        stop_reason: scored.stop_reason,
        cost_micro: scored.cost_micro,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.warn('quality: pair failed', { runId, businessId: business.id, scenarioId: scenario.id, error: msg })
      // Even if the pair errored, the generation cost was already spent.
      await insertErrorResult(runId, business.id, scenario.id, `run errored: ${msg}`, generationCostMicro)
    }

    // Update progress counters + heartbeat after each pair so the UI ticks.
    await advanceProgress(runId)
  }

  // Persist the updated pending matrix (whether anything remains or not).
  await supabaseAdmin
    .from('prompt_eval_runs')
    .update({
      pending_matrix: remaining,
      last_progress_at: new Date().toISOString(),
    })
    .eq('id', runId)

  // Re-check run status (could have been cancelled mid-batch).
  const { data: refreshed } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('status')
    .eq('id', runId)
    .maybeSingle()
  const stillRunning = (refreshed as any)?.status === 'running'

  if (!stillRunning) {
    return NextResponse.json({ ok: true, done: true, status: (refreshed as any)?.status })
  }
  if (remaining.length === 0) {
    await finalizeRun(runId)
    return NextResponse.json({ ok: true, done: true })
  }

  // Chain the next invocation.
  void kickNext(request, runId)
  return NextResponse.json({ ok: true, processed: toProcess.length, remaining: remaining.length })
}

async function advanceProgress(runId: string): Promise<void> {
  // Recompute completed_pairs + cost from fresh aggregates instead of
  // trusting per-call increments - avoids races if a second invocation
  // overlaps.
  const { count } = await supabaseAdmin
    .from('prompt_eval_results')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', runId)
  const { data: rows } = await supabaseAdmin
    .from('prompt_eval_results')
    .select('cost_micro')
    .eq('run_id', runId)
  const costSum = (rows || []).reduce((a, r: any) => a + (Number(r.cost_micro) || 0), 0)
  await supabaseAdmin
    .from('prompt_eval_runs')
    .update({
      completed_pairs: count || 0,
      cost_micro: costSum,
      last_progress_at: new Date().toISOString(),
    })
    .eq('id', runId)
}

async function insertErrorResult(runId: string, businessId: string, scenarioId: string, msg: string, costMicro = 0): Promise<void> {
  const CATEGORIES = [
    'booking_correctness', 'information_completeness', 'sms_consent_disclosure',
    'emergency_handling', 'tone_naturalness', 'hallucination_safety', 'edge_case_handling',
  ]
  await supabaseAdmin.from('prompt_eval_results').insert({
    run_id: runId,
    business_id: businessId,
    scenario_id: scenarioId,
    overall_score: 0,
    expectation_pass: false,
    expectation_notes: [msg],
    scores: CATEGORIES.map((c) => ({ category: c, score: 0, justification: msg })),
    transcript: [{ role: 'agent', text: `RUN ERROR: ${msg}` }],
    tool_calls: [],
    stop_reason: 'error',
    cost_micro: costMicro,
  })
}

async function finalizeRun(runId: string): Promise<void> {
  // Compute aggregate metrics by reading the per-pair results back.
  const { data: results } = await supabaseAdmin
    .from('prompt_eval_results')
    .select('overall_score, expectation_pass, scores')
    .eq('run_id', runId)

  const rows = (results || []) as Array<{ overall_score: number; expectation_pass: boolean; scores: Array<{ category: string; score: number }> }>

  const overall = rows.length ? rows.reduce((a, b) => a + (Number(b.overall_score) || 0), 0) / rows.length : 0
  const expectPass = rows.length ? rows.filter((r) => r.expectation_pass).length / rows.length : 0
  const cats = ['booking_correctness', 'information_completeness', 'sms_consent_disclosure', 'emergency_handling', 'tone_naturalness', 'hallucination_safety', 'edge_case_handling']
  const catAvgs: Record<string, number> = {}
  for (const c of cats) {
    const xs = rows.flatMap((r) => (r.scores || []).filter((s) => s.category === c)).map((s) => s.score)
    catAvgs[c] = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
  }

  await supabaseAdmin
    .from('prompt_eval_runs')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      overall_score: overall,
      expectation_pass_rate: expectPass,
      category_averages: catAvgs,
      pending_matrix: [],
      last_progress_at: new Date().toISOString(),
    })
    .eq('id', runId)
  logger.info('quality eval completed', { runId, overall, expectPass, pairs: rows.length })
}

async function markRunFailed(runId: string, notes: string): Promise<void> {
  await supabaseAdmin
    .from('prompt_eval_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      notes,
      last_progress_at: new Date().toISOString(),
    })
    .eq('id', runId)
}

async function kickNext(request: NextRequest, runId: string): Promise<void> {
  const url = new URL('/api/admin/quality/process', request.nextUrl.origin)
  const cookie = request.headers.get('cookie') || ''
  const authz = request.headers.get('authorization') || ''
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
        ...(authz ? { authorization: authz } : {}),
        'x-internal-eval': '1',
      },
      body: JSON.stringify({ run_id: runId }),
    })
  } catch (e) {
    logger.warn('quality: failed to chain /process', { runId, error: e instanceof Error ? e.message : String(e) })
  }
}
