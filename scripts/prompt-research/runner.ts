/**
 * Local eval runner daemon.
 *
 * Polls Supabase for prompt_eval_runs rows in status='running' with
 * meta.runner='local'. When it finds one, it does the same work
 * /api/admin/quality/process does on Vercel - but without the 30s
 * function timeout. The website creates the row; this daemon
 * actually executes the simulations.
 *
 * Usage:
 *   vercel env pull .env.local         # once
 *   npm run quality:runner             # leave running in a terminal
 *
 * Then click "Run on my laptop" in /admin/quality.
 *
 * Loop semantics:
 *   - One run at a time (the start endpoint already enforces this).
 *   - Process pairs in CONCURRENCY-wide batches until pending_matrix
 *     is empty.
 *   - Idle-poll every 5s when there's nothing to do.
 *   - SIGINT (Ctrl-C) marks the in-flight run 'cancelled' before
 *     exiting so the next start isn't blocked.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadBusinesses, loadScenarios, loadRubric } from './lib/load'
import { generateFullPromptForBusiness } from './lib/generate'
import { processPair } from './lib/run-pair'
import type { BusinessFixture } from './lib/types'

const POLL_INTERVAL_MS = 5_000
const CONCURRENCY = 4
const CATEGORIES = [
  'booking_correctness', 'information_completeness', 'sms_consent_disclosure',
  'emergency_handling', 'tone_naturalness', 'hallucination_safety', 'edge_case_handling',
] as const

type Pending = { business_id: string; scenario_id: string }

let inFlightRunId: string | null = null

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey || !supaUrl || !supaKey) {
    console.error('Missing env. Need ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.')
    console.error('Run: vercel env pull .env.local')
    process.exit(1)
  }
  const supabase = createClient(supaUrl, supaKey)
  const anthropic = new Anthropic({ apiKey })

  // Graceful shutdown - mark the in-flight run cancelled so the next
  // start isn't blocked by a phantom 'running' row.
  const shutdown = async (sig: string) => {
    console.log(`\n${sig} received - shutting down...`)
    if (inFlightRunId) {
      try {
        await supabase.from('prompt_eval_runs').update({
          status: 'cancelled',
          finished_at: new Date().toISOString(),
          notes: `local runner: ${sig}`,
        }).eq('id', inFlightRunId).eq('status', 'running')
        console.log(`marked run ${inFlightRunId.slice(0, 8)} cancelled`)
      } catch { /* best-effort */ }
    }
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  console.log('CloudGreet eval runner ready. Polling every 5s...')
  console.log('Click "Run on my laptop" in /admin/quality to queue a run.')

  // Preload fixtures + rubric once.
  const businesses = loadBusinesses()
  const scenarios = loadScenarios()
  const rubric = loadRubric()
  const baseScnMap = new Map(scenarios.map((s) => [s.id, s]))
  const baseBizMap = new Map<string, BusinessFixture>(businesses.map((b) => [b.id, b]))

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const row = await pickPendingLocalRun(supabase)
      if (!row) {
        await sleep(POLL_INTERVAL_MS)
        continue
      }
      inFlightRunId = row.id
      console.log(`\n--- Picking up run ${row.id.slice(0, 8)} (${row.total_pairs} pairs)`)
      await processRun(supabase, anthropic, row, baseBizMap, baseScnMap, rubric)
      inFlightRunId = null
    } catch (e) {
      console.error('runner loop error:', e instanceof Error ? e.message : e)
      inFlightRunId = null
      await sleep(POLL_INTERVAL_MS)
    }
  }
}

async function pickPendingLocalRun(supabase: SupabaseClient): Promise<RunRow | null> {
  // Status=running + meta.runner=local. The start endpoint marks the
  // row 'running' from the start (the runner is the active worker -
  // no separate 'pending' state needed).
  const { data, error } = await supabase
    .from('prompt_eval_runs')
    .select('id, total_pairs, completed_pairs, pending_matrix, prompts_cache, meta, status')
    .eq('status', 'running')
    .order('started_at', { ascending: true })
    .limit(5)
  if (error) {
    console.error('poll error:', error.message)
    return null
  }
  for (const r of (data || []) as any[]) {
    if (r?.meta?.runner === 'local') return r as RunRow
  }
  return null
}

type RunRow = {
  id: string
  total_pairs: number
  completed_pairs: number
  pending_matrix: Pending[] | null
  prompts_cache: Record<string, string> | null
  meta: Record<string, any> | null
  status: string
}

async function processRun(
  supabase: SupabaseClient,
  client: Anthropic,
  row: RunRow,
  baseBizMap: Map<string, BusinessFixture>,
  scnMap: Map<string, any>,
  rubric: string,
) {
  const runId = row.id
  const bizMap = new Map(baseBizMap)
  if (row.meta?.source === 'client' && row.meta?.client_fixture?.id) {
    bizMap.set(row.meta.client_fixture.id, row.meta.client_fixture as BusinessFixture)
  }
  // mode=client + generate-scenarios stashes the per-client scenarios
  // under meta.generated_scenarios so the runner uses them instead of
  // the canned bank.
  const overrideScenarios = Array.isArray(row.meta?.generated_scenarios)
    ? new Map<string, any>((row.meta!.generated_scenarios as any[]).map((s) => [s.id, s]))
    : null

  let pending = Array.isArray(row.pending_matrix) ? [...row.pending_matrix] : []
  const promptsCache: Record<string, string> = { ...(row.prompts_cache || {}) }
  let genCostByBiz: Record<string, number> = {}

  while (pending.length > 0) {
    // Check for cancel.
    const { data: refreshed } = await supabase
      .from('prompt_eval_runs').select('status').eq('id', runId).maybeSingle()
    if ((refreshed as any)?.status !== 'running') {
      console.log(`run ${runId.slice(0, 8)} status=${(refreshed as any)?.status} - stopping`)
      return
    }

    const batch = pending.slice(0, CONCURRENCY)
    pending = pending.slice(CONCURRENCY)

    // Warm any uncached prompts.
    const toGen = Array.from(new Set(batch.map((p) => p.business_id))).filter((b) => !promptsCache[b])
    if (toGen.length > 0) {
      for (const bid of toGen) {
        const biz = bizMap.get(bid)
        if (!biz) {
          console.log(`  ✗ fixture missing for ${bid}`)
          continue
        }
        try {
          const gen = await generateFullPromptForBusiness(biz)
          promptsCache[bid] = gen.prompt
          genCostByBiz[bid] = gen.cost_micro
          console.log(`  ✓ prompt cached: ${bid} ($${(gen.cost_micro / 1_000_000).toFixed(3)})`)
        } catch (e) {
          console.log(`  ✗ generate failed: ${bid} - ${e instanceof Error ? e.message : String(e)}`)
        }
      }
      await supabase.from('prompt_eval_runs').update({
        prompts_cache: promptsCache,
        last_progress_at: new Date().toISOString(),
      }).eq('id', runId)
    }

    // Process the batch in parallel.
    const usedGen = new Set<string>()
    await Promise.all(batch.map(async (pair) => {
      const business = bizMap.get(pair.business_id)
      const scenario = overrideScenarios?.get(pair.scenario_id) || scnMap.get(pair.scenario_id)
      const agentPrompt = promptsCache[pair.business_id]
      if (!business || !scenario || !agentPrompt) {
        await insertErrorResult(supabase, runId, pair.business_id, pair.scenario_id, 'fixture/prompt missing')
        return
      }
      const extraCost = usedGen.has(pair.business_id) ? 0 : (genCostByBiz[pair.business_id] || 0)
      usedGen.add(pair.business_id)
      try {
        const scored = await processPair(client, agentPrompt, rubric, business, scenario, { extraCostMicro: extraCost })
        await supabase.from('prompt_eval_results').insert({
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
        console.log(`  ✓ ${pair.business_id} × ${pair.scenario_id} = ${(scored.overall * 100).toFixed(0)}% ($${(scored.cost_micro / 1_000_000).toFixed(3)})`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.log(`  ✗ ${pair.business_id} × ${pair.scenario_id} - ${msg}`)
        await insertErrorResult(supabase, runId, pair.business_id, pair.scenario_id, msg, extraCost)
      }
    }))

    // Roll up progress + persist remaining matrix.
    await advanceProgress(supabase, runId)
    await supabase.from('prompt_eval_runs').update({
      pending_matrix: pending,
      last_progress_at: new Date().toISOString(),
    }).eq('id', runId)

    // Generation cost only charged on first use; clear after batch.
    genCostByBiz = {}
  }

  await finalizeRun(supabase, runId)
  console.log(`--- run ${runId.slice(0, 8)} complete`)
}

async function advanceProgress(supabase: SupabaseClient, runId: string) {
  const { count } = await supabase
    .from('prompt_eval_results')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', runId)
  const { data: rows } = await supabase
    .from('prompt_eval_results')
    .select('cost_micro')
    .eq('run_id', runId)
  const costSum = (rows || []).reduce((a, r: any) => a + (Number(r.cost_micro) || 0), 0)
  await supabase.from('prompt_eval_runs').update({
    completed_pairs: count || 0,
    cost_micro: costSum,
    last_progress_at: new Date().toISOString(),
  }).eq('id', runId)
}

async function insertErrorResult(
  supabase: SupabaseClient, runId: string, businessId: string, scenarioId: string, msg: string, costMicro = 0,
) {
  await supabase.from('prompt_eval_results').insert({
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

async function finalizeRun(supabase: SupabaseClient, runId: string) {
  const { data: results } = await supabase
    .from('prompt_eval_results')
    .select('overall_score, expectation_pass, scores')
    .eq('run_id', runId)
  const rows = (results || []) as Array<{ overall_score: number; expectation_pass: boolean; scores: Array<{ category: string; score: number }> }>
  const overall = rows.length ? rows.reduce((a, b) => a + (Number(b.overall_score) || 0), 0) / rows.length : 0
  const expectPass = rows.length ? rows.filter((r) => r.expectation_pass).length / rows.length : 0
  const catAvgs: Record<string, number> = {}
  for (const c of CATEGORIES) {
    const xs = rows.flatMap((r) => (r.scores || []).filter((s) => s.category === c)).map((s) => s.score)
    catAvgs[c] = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
  }
  await supabase.from('prompt_eval_runs').update({
    status: 'completed',
    finished_at: new Date().toISOString(),
    overall_score: overall,
    expectation_pass_rate: expectPass,
    category_averages: catAvgs,
    pending_matrix: [],
    last_progress_at: new Date().toISOString(),
  }).eq('id', runId)
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

main().catch((e) => { console.error(e); process.exit(1) })
