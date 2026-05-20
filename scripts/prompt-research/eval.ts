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
import { loadBusinesses, loadScenarios, loadRubric, buildMatrix } from './lib/load'
import { generateFullPromptForBusiness } from './lib/generate'
import { runSimulation } from './lib/simulate'
import { scoreSimulation } from './lib/score'
import { renderReport } from './lib/report'
import type { ScoredResult, RunSummary } from './lib/types'

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

  console.log(`prompt-research starting: ${matrix.length} pairs at concurrency ${flags.concurrency}`)
  console.log(`output dir: ${runDir}`)

  // 1) Generate prompts once per UNIQUE business in the matrix.
  const uniqueBizIds = Array.from(new Set(matrix.map((p) => p.business.id)))
  const promptByBiz = new Map<string, string>()
  console.log(`generating prompts for ${uniqueBizIds.length} business fixtures...`)
  const promptResults = await pool(uniqueBizIds, Math.min(flags.concurrency, 3), async (bid) => {
    const b = businesses.find((x) => x.id === bid)!
    try {
      const p = await generateFullPromptForBusiness(b)
      console.log(`  ✓ generated: ${bid} (${p.length} chars)`)
      return { bid, prompt: p, ok: true as const }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`  ✗ generate failed: ${bid} - ${msg}`)
      return { bid, prompt: '', ok: false as const, error: msg }
    }
  })
  for (const r of promptResults) {
    if (r.ok) promptByBiz.set(r.bid, r.prompt)
  }
  if (promptByBiz.size === 0) {
    console.error('All generations failed. Aborting.')
    process.exit(1)
  }

  // 2) Run + score each pair (skip pairs whose business prompt failed).
  const runnable = matrix.filter((p) => promptByBiz.has(p.business.id))
  console.log(`running ${runnable.length} simulations...`)
  const results: ScoredResult[] = await pool(runnable, flags.concurrency, async (pair, idx) => {
    const tag = `[${idx + 1}/${runnable.length}] ${pair.business.id} × ${pair.scenario.id}`
    try {
      const prompt = promptByBiz.get(pair.business.id)!
      const sim = await runSimulation(client, prompt, pair.business, pair.scenario)
      const scored = await scoreSimulation(client, rubric, pair.business, pair.scenario, sim)
      console.log(`  ✓ ${tag} overall=${scored.overall.toFixed(2)} expect=${scored.expectation_pass ? 'pass' : 'FAIL'}`)
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

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
