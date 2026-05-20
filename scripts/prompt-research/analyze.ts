/**
 * Failure-Reading Agent (Brain Piece 1).
 *
 * Given a completed prompt-research run, this agent:
 *   - Loads the bottom-K worst pairs (by overall_score)
 *   - Reads each transcript, tool calls, judge scores, and the FULL
 *     agent prompt that was tested
 *   - Reads the prompt-generator source (v21-system-prompt.ts +
 *     universal-layer.ts + generate.ts)
 *   - Asks Claude Opus to diagnose:
 *       1. Per-pair: why did THIS specific pair fail? what part of
 *          the prompt is responsible? what should change?
 *       2. Cross-cutting patterns: themes across the bottom-K
 *       3. Prioritized fixes: 1-3 concrete edits to agent-builder/*
 *          ranked by impact-vs-effort
 *
 * Output lands in prompt_eval_runs.analysis (jsonb) and is rendered
 * inline on /admin/quality as a "What to fix" panel.
 *
 * This is NOT the patch-proposing agent (Brain Piece 2). It does NOT
 * write code. It writes a diagnosis. A human still applies the fix.
 * That's intentional - we want to validate the analyst's judgement
 * before letting it commit code.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/prompt-research/analyze.ts <run_id>
 *
 * Cost: ~$0.30-0.60 per analysis depending on transcript lengths.
 * Cheap, run after every eval.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ANALYST_MODEL = 'claude-opus-4-7'
const BOTTOM_K = 5
const MAX_TRANSCRIPT_TURNS = 30

type Score = { category: string; score: number; justification: string }
type ToolCall = { tool: string; args: Record<string, unknown>; response: unknown }
type Turn = { role: 'agent' | 'caller'; text: string }

type PairResult = {
  id: string
  business_id: string
  scenario_id: string
  overall_score: number
  expectation_pass: boolean
  expectation_notes: string[] | null
  scores: Score[]
  transcript: Turn[]
  tool_calls: ToolCall[]
  stop_reason: string
}

type Analysis = {
  generated_at: string
  model: string
  per_pair: Array<{
    business_id: string
    scenario_id: string
    overall_score: number
    why_it_failed: string
    responsible_source: string
    recommended_fix: string
  }>
  patterns: Array<{
    pattern: string
    affected_pairs: string[]
    severity: 'critical' | 'high' | 'medium' | 'low'
  }>
  prioritized_fixes: Array<{
    rank: number
    title: string
    file: string
    rationale: string
    estimated_score_delta: string
    suggested_diff_hint: string
  }>
  meta: {
    bottom_k_pairs: number
    eval_run_id: string
    run_overall_score: number | null
    run_expectation_pass_rate: number | null
  }
}

async function main() {
  const runId = process.argv[2]
  if (!runId) {
    console.error('Usage: npx tsx scripts/prompt-research/analyze.ts <run_id>')
    process.exit(1)
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!supaUrl || !supaKey || !anthropicKey) {
    console.error('Missing env. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.')
    process.exit(1)
  }

  const supabase = createClient(supaUrl, supaKey)
  const client = new Anthropic({ apiKey: anthropicKey })

  // 1. Load run + bottom-K results.
  const { data: run, error: runErr } = await supabase
    .from('prompt_eval_runs')
    .select('id, status, overall_score, expectation_pass_rate, category_averages, prompts_cache, meta, generator_sha')
    .eq('id', runId)
    .maybeSingle()
  if (runErr || !run) {
    console.error('Run not found:', runErr?.message)
    process.exit(1)
  }

  const { data: results, error: resErr } = await supabase
    .from('prompt_eval_results')
    .select('id, business_id, scenario_id, overall_score, expectation_pass, expectation_notes, scores, transcript, tool_calls, stop_reason')
    .eq('run_id', runId)
    .order('overall_score', { ascending: true })
    .limit(BOTTOM_K)
  if (resErr || !results) {
    console.error('Failed to load results:', resErr?.message)
    process.exit(1)
  }

  const pairs = results as PairResult[]
  console.log(`Loaded ${pairs.length} worst pairs from run ${runId}`)
  for (const p of pairs) {
    console.log(`  ${p.business_id} × ${p.scenario_id} = ${(p.overall_score * 100).toFixed(0)}%`)
  }

  // 2. Load the prompt-builder source files. These are what the
  //    analyst will recommend changes against.
  const root = process.cwd()
  const sources = {
    'v21-system-prompt.ts': readFileSync(join(root, 'lib/agent-builder/v21-system-prompt.ts'), 'utf8'),
    'universal-layer.ts': readFileSync(join(root, 'lib/agent-builder/universal-layer.ts'), 'utf8'),
    'generate.ts': readFileSync(join(root, 'lib/agent-builder/generate.ts'), 'utf8'),
  }
  console.log(`Loaded source: ${Object.keys(sources).join(', ')}`)

  // 3. Build the analyst's payload.
  const promptsCache = ((run as any).prompts_cache || {}) as Record<string, string>
  const analystInput = buildAnalystPayload(pairs, sources, promptsCache, run as any)
  const systemPrompt = SYSTEM_PROMPT

  console.log(`Calling ${ANALYST_MODEL}...`)
  const resp = await client.messages.create({
    model: ANALYST_MODEL,
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: analystInput }],
  })

  const text = (resp.content.find((b: any) => b.type === 'text') as any)?.text || ''
  const analysis = parseAnalysis(text)
  if (!analysis) {
    console.error('Analyst returned unparseable output. Raw response saved.')
    console.error(text.slice(0, 500))
    process.exit(1)
  }

  // Sonnet 4.6 rates as fallback. Opus 4.7 is roughly 5x.
  const usage = (resp as any).usage || {}
  const costMicro = Math.round(
    (usage.input_tokens || 0) * 15 +
    (usage.output_tokens || 0) * 75,
  )

  const fullAnalysis: Analysis = {
    generated_at: new Date().toISOString(),
    model: ANALYST_MODEL,
    per_pair: analysis.per_pair,
    patterns: analysis.patterns,
    prioritized_fixes: analysis.prioritized_fixes,
    meta: {
      bottom_k_pairs: pairs.length,
      eval_run_id: runId,
      run_overall_score: (run as any).overall_score,
      run_expectation_pass_rate: (run as any).expectation_pass_rate,
    },
  }

  // 4. Persist on the run row.
  const { error: updErr } = await supabase
    .from('prompt_eval_runs')
    .update({
      analysis: fullAnalysis,
      analyzed_at: new Date().toISOString(),
      analysis_cost_micro: costMicro,
    })
    .eq('id', runId)
  if (updErr) {
    console.error('Failed to persist analysis:', updErr.message)
    process.exit(1)
  }

  // 5. Print markdown summary to stdout.
  console.log('')
  console.log('═'.repeat(60))
  console.log(`ANALYSIS COMPLETE  •  $${(costMicro / 1_000_000).toFixed(3)}`)
  console.log('═'.repeat(60))
  console.log('')
  console.log('## Prioritized fixes')
  for (const f of fullAnalysis.prioritized_fixes) {
    console.log(`\n${f.rank}. **${f.title}** (${f.file})`)
    console.log(`   ${f.rationale}`)
    console.log(`   Est. score impact: ${f.estimated_score_delta}`)
  }
  console.log('')
  console.log('## Cross-cutting patterns')
  for (const p of fullAnalysis.patterns) {
    console.log(`\n[${p.severity.toUpperCase()}] ${p.pattern}`)
    console.log(`   Affects: ${p.affected_pairs.join(', ')}`)
  }
  console.log('')
  console.log(`View on /admin/quality (run ${runId.slice(0, 8)}).`)
}

const SYSTEM_PROMPT = `You are CloudGreet's prompt-engineering expert. CloudGreet ships AI voice receptionists for service contractors via Retell. The receptionist prompts are generated by a Claude call (lib/agent-builder/generate.ts) using a system prompt + few-shot examples, with a universal-rules block (lib/agent-builder/universal-layer.ts) appended.

You're given:
- The bottom-K worst-scoring (business × scenario) pairs from a recent eval
- The exact agent prompt the receptionist used for each pair
- The conversation transcript, tool calls, and judge's per-category scores
- The full source of the prompt-generator (v21-system-prompt.ts, universal-layer.ts, generate.ts)

Your job:
1. For EACH pair, diagnose: what specifically went wrong, which part of the prompt-generator source is responsible (file + section), and what to change to fix it. Be SHARP - point at lines, not vibes. Distinguish "the agent did the right thing but the scenario expected wrong" from "the agent genuinely failed".
2. Find CROSS-CUTTING patterns across the bottom-K. Things like "all 3 restaurant failures stem from no few-shot example for hospitality" or "agent calls book_appointment 80% of the time but skips send_booking_sms when the caller declines SMS - the prompt is ambiguous about this".
3. Prioritize 1-3 SPECIFIC FIXES ranked by impact-vs-effort. Each fix should name the file, describe the change, and estimate the score delta.

Output STRICT JSON in this shape - no prose around it:

\`\`\`json
{
  "per_pair": [
    {
      "business_id": "...",
      "scenario_id": "...",
      "overall_score": 0.0,
      "why_it_failed": "1-2 sentences. Distinguish agent-genuinely-failed vs scenario-was-buggy.",
      "responsible_source": "filename + section ref, e.g. 'universal-layer.ts BOOKING FLOW PRIORITY'",
      "recommended_fix": "1-2 sentences with the concrete change"
    }
  ],
  "patterns": [
    {
      "pattern": "one-sentence theme",
      "affected_pairs": ["bizA × scenA", "bizB × scenB"],
      "severity": "critical|high|medium|low"
    }
  ],
  "prioritized_fixes": [
    {
      "rank": 1,
      "title": "Short imperative title",
      "file": "lib/agent-builder/universal-layer.ts",
      "rationale": "Why this fix, and what specifically to change. 2-3 sentences.",
      "estimated_score_delta": "+X% overall / +Y on category Z",
      "suggested_diff_hint": "Brief snippet of what to add/remove/edit. Not a real diff - just a hint."
    }
  ]
}
\`\`\`

Be honest about scenarios that were BUGGY (e.g. fake-urgency-routine uses an HVAC persona but the matrix runs it against electricians/restaurants - that's a scenario authoring issue not a prompt-builder issue). Call those out clearly in the per_pair diagnosis. Don't propose prompt-builder fixes for problems that are actually scenario-design problems.

Output ONLY the JSON. No markdown code fences, no preamble, no postscript.`

function buildAnalystPayload(
  pairs: PairResult[],
  sources: Record<string, string>,
  promptsCache: Record<string, string>,
  run: { id: string; overall_score?: number; expectation_pass_rate?: number; category_averages?: Record<string, number>; generator_sha?: string },
): string {
  const lines: string[] = []
  lines.push('# Eval run summary')
  lines.push(`Run id: ${run.id}`)
  lines.push(`Generator sha: ${run.generator_sha || 'unknown'}`)
  lines.push(`Overall: ${run.overall_score != null ? (run.overall_score * 100).toFixed(1) + '%' : '—'}`)
  lines.push(`Expectation pass rate: ${run.expectation_pass_rate != null ? (run.expectation_pass_rate * 100).toFixed(1) + '%' : '—'}`)
  if (run.category_averages) {
    lines.push(`Category averages: ${JSON.stringify(run.category_averages)}`)
  }
  lines.push('')
  lines.push('# Bottom-K worst pairs')
  lines.push('')

  for (const p of pairs) {
    lines.push(`## ${p.business_id} × ${p.scenario_id} — overall ${(p.overall_score * 100).toFixed(0)}%`)
    lines.push(`expectation_pass: ${p.expectation_pass}`)
    if (p.expectation_notes && p.expectation_notes.length) {
      lines.push(`expectation_notes:`)
      for (const n of p.expectation_notes) lines.push(`  - ${n}`)
    }
    lines.push('')
    lines.push('### Judge scores')
    for (const s of p.scores) {
      lines.push(`- ${s.category}: ${s.score}/3 — ${s.justification}`)
    }
    lines.push('')
    if (p.tool_calls?.length) {
      lines.push('### Tool calls')
      for (const t of p.tool_calls) {
        lines.push(`- ${t.tool}(${JSON.stringify(t.args)}) → ${JSON.stringify(t.response)}`)
      }
      lines.push('')
    }
    lines.push('### Transcript')
    const turns = (p.transcript || []).slice(0, MAX_TRANSCRIPT_TURNS)
    for (const t of turns) {
      lines.push(`${t.role.toUpperCase()}: ${t.text}`)
    }
    if ((p.transcript || []).length > MAX_TRANSCRIPT_TURNS) {
      lines.push(`... (${p.transcript.length - MAX_TRANSCRIPT_TURNS} turns truncated)`)
    }
    lines.push('')
    const prompt = promptsCache[p.business_id]
    if (prompt) {
      lines.push('### The agent prompt that was used for this pair')
      lines.push('```')
      lines.push(prompt)
      lines.push('```')
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  lines.push('# Prompt-generator source files')
  for (const [name, content] of Object.entries(sources)) {
    lines.push(`## ${name}`)
    lines.push('```typescript')
    lines.push(content)
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

function parseAnalysis(raw: string): { per_pair: any[]; patterns: any[]; prioritized_fixes: any[] } | null {
  // Strip optional code fences and look for first { to last }.
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end < 0) return null
    const obj = JSON.parse(cleaned.slice(start, end + 1))
    if (!obj?.per_pair || !obj?.patterns || !obj?.prioritized_fixes) return null
    return obj
  } catch {
    return null
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
