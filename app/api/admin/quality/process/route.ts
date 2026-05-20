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
 * Pulls the next batch of pending pairs off the run's `pending_matrix`,
 * processes them IN PARALLEL within this invocation, inserts results,
 * decrements the pending matrix, and fires off the NEXT /process call
 * to keep the chain going.
 *
 * Parallel batch (not sequential) because each pair is ~30s of mostly-
 * idle network time waiting on Anthropic - parallelising lets us hit
 * 3 pairs in roughly the same wall-clock budget that one sequential
 * pair would take. With maxDuration=60s and ~35s typical per pair, 3
 * concurrent pairs is the sweet spot.
 *
 * Safety:
 *   - if run.status != 'running' we no-op (handles cancellation)
 *   - if pending_matrix is empty we mark completed and stop
 *   - any error inside a pair is caught and recorded as a 0-score
 *     stub so the chain doesn't die on one bad pair
 */

// 3 pairs in parallel per invocation. Anthropic Tier 2 has 450K
// input tokens per minute on Sonnet - plenty of headroom for 3
// concurrent pairs even without prompt caching. Each pair averages
// ~25-40s wall time when not rate-limited; 3 in parallel fit
// comfortably inside the 60s Vercel function cap.
// Retry-with-backoff stays in place as a safety net in case
// Anthropic returns a transient 429.
const PAIRS_PER_INVOCATION = 3

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

  // ---- Step 1: warm the prompts cache (defer pairs if anything was generated) ----
  // Generation + simulation in the same invocation can exceed Vercel's
  // 60s function cap (~28s for 3 generations + 30-60s for 3 parallel
  // simulations). Split them: if this invocation generated ANY prompts,
  // persist the cache + heartbeat + chain to a fresh invocation that
  // starts with a warm cache and only has to run pairs. Costs us a few
  // extra invocations early on, but the chain stays alive.
  const generationCostByBiz: Record<string, number> = {}
  const uniqueBizInBatch = Array.from(new Set(toProcess.map((p) => p.business_id)))
  const toGenerate = uniqueBizInBatch.filter((bid) => !promptsCache[bid])

  if (toGenerate.length > 0) {
    const genResults = await Promise.all(toGenerate.map(async (bid) => {
      const biz = bizMap.get(bid)
      if (!biz) return { bid, ok: false as const, error: 'fixture missing' }
      try {
        const gen = await generateFullPromptForBusiness(biz)
        return { bid, ok: true as const, prompt: gen.prompt, cost: gen.cost_micro }
      } catch (e) {
        return { bid, ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    }))
    for (const g of genResults) {
      if (g.ok) {
        promptsCache[g.bid] = g.prompt
        generationCostByBiz[g.bid] = g.cost
      }
    }
    await supabaseAdmin
      .from('prompt_eval_runs')
      .update({ prompts_cache: promptsCache, last_progress_at: new Date().toISOString() })
      .eq('id', runId)
    for (const g of genResults) {
      if (!g.ok) {
        // Pre-fail every pair in this batch from this business and drop them
        // from pending so we don't keep tripping over them.
        const droppedScenarios: string[] = []
        for (const p of toProcess) {
          if (p.business_id === g.bid) {
            await insertErrorResult(runId, p.business_id, p.scenario_id, `generate failed: ${g.error}`, 0)
            droppedScenarios.push(p.scenario_id)
          }
        }
        // Strip ALL remaining pairs for this failed business from the
        // pending matrix - no point retrying generation 12 more times.
        const stillPending = remaining.filter((p) => p.business_id !== g.bid)
        remaining.length = 0
        remaining.push(...stillPending)
        logger.warn('quality: generate failed', { runId, businessId: g.bid, error: g.error, dropped: droppedScenarios.length })
      }
    }

    // CHAIN TO NEXT INVOCATION instead of running pairs in this one.
    // Persist the matrix (with any failed-business pairs dropped) and
    // hand off. The next /process call has a fully warm cache for these
    // businesses and goes straight to pair processing.
    await supabaseAdmin
      .from('prompt_eval_runs')
      .update({ pending_matrix: [...toProcess.filter((p) => promptsCache[p.business_id]), ...remaining], last_progress_at: new Date().toISOString() })
      .eq('id', runId)
    kickNext(request, runId)
    return NextResponse.json({ ok: true, generated: toGenerate.length, deferredPairs: toProcess.length })
  }

  // ---- Step 2: process all pairs in PARALLEL ----
  // First pair for each business in this batch absorbs the generation
  // cost; subsequent pairs from the same business get 0 extra.
  const genCostUsed = new Set<string>()
  const tasks = toProcess
    .filter((p) => promptsCache[p.business_id]) // skip pairs whose gen failed
    .map((p) => {
      const extra = genCostUsed.has(p.business_id) ? 0 : (generationCostByBiz[p.business_id] || 0)
      genCostUsed.add(p.business_id)
      return { pair: p, extraCost: extra }
    })

  await Promise.all(tasks.map(async ({ pair, extraCost }) => {
    const business = bizMap.get(pair.business_id)
    const scenario = scnMap.get(pair.scenario_id)
    if (!business || !scenario) {
      await insertErrorResult(runId, pair.business_id, pair.scenario_id, 'fixture missing on disk')
      return
    }
    const agentPrompt = promptsCache[business.id]
    try {
      const scored = await processPair(client, agentPrompt, rubric, business, scenario, {
        extraCostMicro: extraCost,
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
      await insertErrorResult(runId, business.id, scenario.id, `run errored: ${msg}`, extraCost)
    }
  }))

  // Single progress update after the parallel batch lands.
  await advanceProgress(runId)

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
  kickNext(request, runId)
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

function kickNext(request: NextRequest, runId: string): void {
  const url = new URL('/api/admin/quality/process', request.nextUrl.origin)
  const cookie = request.headers.get('cookie') || ''
  const authz = request.headers.get('authorization') || ''
  // Fire-and-forget. Awaiting this would hold the current invocation
  // open until the next one finishes, breaking the chain.
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(authz ? { authorization: authz } : {}),
      'x-internal-eval': '1',
    },
    body: JSON.stringify({ run_id: runId }),
  }).catch((e) => {
    logger.warn('quality: failed to chain /process', { runId, error: e instanceof Error ? e.message : String(e) })
  })
}
