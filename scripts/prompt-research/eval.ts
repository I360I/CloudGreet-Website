/**
 * Main eval entrypoint. Usage:
 *   npx tsx --env-file=.env.local scripts/prompt-research/eval.ts \
 *     [--only=<scenario-id>] [--business=<id>] [--limit=N] [--concurrency=N]
 *
 * Outputs:
 *   scripts/prompt-research/runs/<timestamp>/report.md
 *   scripts/prompt-research/runs/<timestamp>/results.json
 *   scripts/prompt-research/runs/latest -> <timestamp> (symlink)
 *
 * Generation runs ONCE per business (not per scenario) - same prompt
 * gets reused across that business's scenarios, which is exactly how
 * production works (one agent, many calls). This also halves the
 * Anthropic bill for a full sweep.
 */

import Anthropic from '@anthropic-ai/sdk'
import { mkdirSync, writeFileSync, existsSync, symlinkSync, unlinkSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadBusinesses, loadScenarios, loadRubric, buildMatrix } from './lib/load'
import { generateFullPromptForBusiness } from './lib/generate'
import { processPair } from './lib/run-pair'
import { renderReport } from './lib/report'
import type { ScoredResult, RunSummary, RubricCategory } from './lib/types'

const CATEGORIES: RubricCategory[] = [
  'booking_correctness', 'information_completeness', 'sms_consent_disclosure',
  'emergency_handling', 'tone_naturalness', 'hallucination_safety', 'edge_case_handling',
]

type Flags = {
  only?: string
  business?: string
  limit?: number
  concurrency: number
}

function parseFlags(argv: string[]): Flags {
  const f: Flags = { concurrency: 4 }
  for (const a of argv) {
    if (a.startsWith('--only=')) f.only = a.slice('--only='.length)
    else if (a.startsWith('--business=')) f.business = a.slice('--business='.length)
    else if (a.startsWith('--limit=')) f.limit = Number(a.slice('--limit='.length))
    else if (a.startsWith('--concurrency=')) f.concurrency = Math.max(1, Number(a.slice('--concurrency='.length)))
  }
  return f
}

function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'no-git'
  }
}

async function pool<T, R>(items: T[], concurrency: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return out
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Missing ANTHROPIC_API_KEY. Run: vercel env pull .env.local && npx tsx --env-file=.env.local scripts/prompt-research/eval.ts')
    process.exit(1)
  }

  const flags = parseFlags(process.argv.slice(2))
  const client = new Anthropic({ apiKey })

  const businesses = loadBusinesses()
  const scenarios = loadScenarios()
  const rubric = loadRubric()

  let matrix = buildMatrix(businesses, scenarios)
  if (flags.only) matrix = matrix.filter((p) => p.scenario.id === flags.only)
  if (flags.business) matrix = matrix.filter((p) => p.business.id === flags.business)
  if (flags.limit) matrix = matrix.slice(0, flags.limit)

  if (matrix.length === 0) {
    console.error('Matrix is empty after filters. Check --only / --business values.')
    process.exit(1)
  }

  const startedAt = new Date().toISOString()
  const timestamp = startedAt.replace(/[:.]/g, '-')
  const runDir = join(new URL('.', import.meta.url).pathname, 'runs', timestamp)
  mkdirSync(runDir, { recursive: true })

  // Supabase progress reporting. Optional - if either env var is missing
  // we just skip and write to disk only. Admin UI reads from these tables.
  const supabase = buildSupabaseClient()
  const sha = gitSha()
  const runId = await createRunRow(supabase, matrix.length, sha)
  if (runId) console.log(`run row created in Supabase: ${runId}`)

  console.log(`prompt-research starting: ${matrix.length} pairs at concurrency ${flags.concurrency}`)
  console.log(`output dir: ${runDir}`)

  // 1) Generate prompts once per UNIQUE business in the matrix.
  const uniqueBizIds = Array.from(new Set(matrix.map((p) => p.business.id)))
  const promptByBiz = new Map<string, string>()
  console.log(`generating prompts for ${uniqueBizIds.length} business fixtures...`)
  const genCostByBiz = new Map<string, number>()
  const promptResults = await pool(uniqueBizIds, Math.min(flags.concurrency, 3), async (bid) => {
    const b = businesses.find((x) => x.id === bid)!
    try {
      const gen = await generateFullPromptForBusiness(b)
      console.log(`  ✓ generated: ${bid} (${gen.prompt.length} chars, $${(gen.cost_micro / 1_000_000).toFixed(3)})`)
      return { bid, prompt: gen.prompt, cost: gen.cost_micro, ok: true as const }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`  ✗ generate failed: ${bid} - ${msg}`)
      return { bid, prompt: '', cost: 0, ok: false as const, error: msg }
    }
  })
  for (const r of promptResults) {
    if (r.ok) {
      promptByBiz.set(r.bid, r.prompt)
      genCostByBiz.set(r.bid, r.cost)
    }
  }
  if (promptByBiz.size === 0) {
    console.error('All generations failed. Aborting.')
    process.exit(1)
  }

  // 2) Run + score each pair (skip pairs whose business prompt failed).
  const runnable = matrix.filter((p) => promptByBiz.has(p.business.id))
  console.log(`running ${runnable.length} simulations...`)
  // Track which businesses we've already attributed generation cost to.
  // First pair for each business folds gen cost in; subsequent pairs don't.
  const genCostUsed = new Set<string>()
  const results: ScoredResult[] = await pool(runnable, flags.concurrency, async (pair, idx) => {
    const tag = `[${idx + 1}/${runnable.length}] ${pair.business.id} × ${pair.scenario.id}`
    try {
      const prompt = promptByBiz.get(pair.business.id)!
      const extra = genCostUsed.has(pair.business.id) ? 0 : (genCostByBiz.get(pair.business.id) || 0)
      genCostUsed.add(pair.business.id)
      const scored = await processPair(client, prompt, rubric, pair.business, pair.scenario, { extraCostMicro: extra })
      console.log(`  ✓ ${tag} overall=${scored.overall.toFixed(2)} cost=$${(scored.cost_micro / 1_000_000).toFixed(3)} expect=${scored.expectation_pass ? 'pass' : 'FAIL'}`)
      await persistResult(supabase, runId, scored)
      return scored
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`  ✗ ${tag} ${msg}`)
      // Stub failed runs so the report still shows them.
      return {
        business_id: pair.business.id,
        scenario_id: pair.scenario.id,
        agent_prompt: '',
        transcript: [{ role: 'agent' as const, text: `RUN ERROR: ${msg}` }],
        tool_calls: [],
        hit_turn_limit: false,
        stop_reason: 'error',
        scores: [
          'booking_correctness', 'information_completeness', 'sms_consent_disclosure',
          'emergency_handling', 'tone_naturalness', 'hallucination_safety', 'edge_case_handling',
        ].map((c) => ({ category: c as any, score: 0, justification: 'run errored' })),
        overall: 0,
        expectation_pass: false,
        expectation_notes: [`run errored: ${msg}`],
        cost_micro: 0,
      } satisfies ScoredResult
    }
  })

  const finishedAt = new Date().toISOString()
  const summary: RunSummary = {
    started_at: startedAt,
    finished_at: finishedAt,
    generator_sha: gitSha(),
    results,
  }

  writeFileSync(join(runDir, 'results.json'), JSON.stringify(summary, null, 2))
  const report = renderReport(summary)
  writeFileSync(join(runDir, 'report.md'), report)

  await finalizeRun(supabase, runId, summary)

  // Update `latest` symlink for convenience.
  const latest = join(new URL('.', import.meta.url).pathname, 'runs', 'latest')
  try {
    if (existsSync(latest)) {
      try { unlinkSync(latest) } catch { rmSync(latest, { recursive: true, force: true }) }
    }
    symlinkSync(timestamp, latest, 'dir')
  } catch {
    // best-effort - symlinks fail on some filesystems
  }

  console.log('')
  console.log('Run complete.')
  console.log(`  Report:  ${join(runDir, 'report.md')}`)
  console.log(`  Results: ${join(runDir, 'results.json')}`)
}

// ---- Supabase progress reporting --------------------------------------

function buildSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log('(Supabase env not set - skipping admin-UI reporting; results still saved to disk)')
    return null
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function createRunRow(s: SupabaseClient | null, totalPairs: number, sha: string): Promise<string | null> {
  if (!s) return null
  const { data, error } = await s
    .from('prompt_eval_runs')
    .insert({ status: 'running', total_pairs: totalPairs, generator_sha: sha })
    .select('id')
    .single()
  if (error) {
    console.log(`(Supabase: failed to create run row: ${error.message})`)
    return null
  }
  return (data as any).id as string
}

async function persistResult(s: SupabaseClient | null, runId: string | null, scored: ScoredResult): Promise<void> {
  if (!s || !runId) return
  const { error } = await s.from('prompt_eval_results').insert({
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
  if (error) console.log(`(Supabase: insert result failed: ${error.message})`)
  // Recompute completed_pairs + cost_micro from aggregates - avoids
  // races when --concurrency > 1.
  const { count } = await s.from('prompt_eval_results').select('id', { count: 'exact', head: true }).eq('run_id', runId)
  const { data: rows } = await s.from('prompt_eval_results').select('cost_micro').eq('run_id', runId)
  const costSum = (rows || []).reduce((a, r: any) => a + (Number(r.cost_micro) || 0), 0)
  await s.from('prompt_eval_runs').update({ completed_pairs: count || 0, cost_micro: costSum }).eq('id', runId)
}

async function finalizeRun(s: SupabaseClient | null, runId: string | null, summary: RunSummary): Promise<void> {
  if (!s || !runId) return
  const overall = summary.results.length
    ? summary.results.reduce((a, b) => a + b.overall, 0) / summary.results.length
    : 0
  const expectPass = summary.results.length
    ? summary.results.filter((r) => r.expectation_pass).length / summary.results.length
    : 0
  const catAvgs: Record<string, number> = {}
  for (const c of CATEGORIES) {
    const scores = summary.results.flatMap((r) => r.scores.filter((s) => s.category === c)).map((s) => s.score)
    catAvgs[c] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  }
  const totalCost = summary.results.reduce((a, r) => a + (r.cost_micro || 0), 0)
  const { error } = await s.from('prompt_eval_runs').update({
    status: 'completed',
    finished_at: summary.finished_at,
    overall_score: overall,
    expectation_pass_rate: expectPass,
    category_averages: catAvgs,
    cost_micro: totalCost,
  }).eq('id', runId)
  if (error) console.log(`(Supabase: finalize failed: ${error.message})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
