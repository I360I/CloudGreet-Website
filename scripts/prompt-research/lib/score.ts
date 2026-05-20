/**
 * Score a completed simulation using Claude-as-judge against the rubric.
 *
 * We give the judge:
 *   - the rubric markdown
 *   - the scenario's expectations (especially the checks list)
 *   - the agent's full prompt (so it can spot hallucinations vs knowledge)
 *   - the transcript
 *   - the tool calls (because the judge needs to confirm must_call /
 *     must_not_call expectations and the contents of arg payloads)
 *
 * Output is strict JSON. We retry once with a stricter system if the
 * first response can't be parsed, then give up and assign neutral 1s
 * for that scenario (so a parse failure doesn't tank the report).
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  BusinessFixture, ScenarioFixture, SimulationResult,
  ScoredResult, RubricScore, RubricCategory,
} from './types'

const JUDGE_MODEL = 'claude-sonnet-4-6'
const JUDGE_MAX_TOKENS = 1500

const CATEGORIES: RubricCategory[] = [
  'booking_correctness',
  'information_completeness',
  'sms_consent_disclosure',
  'emergency_handling',
  'tone_naturalness',
  'hallucination_safety',
  'edge_case_handling',
]

export async function scoreSimulation(
  client: Anthropic,
  rubric: string,
  business: BusinessFixture,
  scenario: ScenarioFixture,
  sim: SimulationResult,
): Promise<ScoredResult> {
  const expectationPass = checkExpectations(scenario, sim)

  const judgePrompt = [
    rubric,
    '',
    '---',
    '',
    'Scenario being evaluated:',
    `id: ${scenario.id}`,
    `label: ${scenario.label}`,
    '',
    'Scenario expectations (use these for edge_case_handling especially):',
    JSON.stringify(scenario.expectations, null, 2),
    '',
    'The business the agent was running for (this is the GROUND TRUTH for what services / prices / hours / area the agent knows):',
    JSON.stringify(business.context.business, null, 2),
    'Services offered: ' + (business.context.services.offered.join(', ') || '-'),
    'Services NOT offered: ' + (business.context.services.not_offered.join(', ') || '-'),
    'Pricing notes: ' + (business.context.pricing.notes.join(' | ') || '-'),
    '',
    '---',
    '',
    'Tool calls the agent made (in order):',
    sim.tool_calls.length === 0
      ? '(none)'
      : sim.tool_calls.map((t) => `  - ${t.tool}(${JSON.stringify(t.args)}) -> ${JSON.stringify(t.response)}`).join('\n'),
    '',
    'Conversation transcript:',
    sim.transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join('\n'),
    '',
    '---',
    '',
    'Now score using the rubric. Output STRICT JSON only.',
  ].join('\n')

  const scores = await runJudge(client, judgePrompt)
  const overall = scores.reduce((a, b) => a + b.score, 0) / (CATEGORIES.length * 3)

  return {
    ...sim,
    scores,
    overall,
    expectation_pass: expectationPass.pass,
    expectation_notes: expectationPass.notes,
    // Cost is attached by processPair() once the meter has finished
    // accumulating across simulate + score; placeholder for now.
    cost_micro: 0,
  }
}

async function runJudge(client: Anthropic, prompt: string, attempt = 1): Promise<RubricScore[]> {
  const resp = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: JUDGE_MAX_TOKENS,
    system: attempt === 1
      ? 'You are a strict but fair evaluator. Output ONLY the JSON block as instructed. No prose before or after.'
      : 'CRITICAL: previous response could not be parsed. Output ONLY the JSON object, starting with { and ending with }. No code fences, no explanation, no markdown.',
    messages: [{ role: 'user', content: prompt }],
  })
  const text = (resp.content.find((b: any) => b.type === 'text') as any)?.text || ''
  const parsed = tryParse(text)
  if (!parsed && attempt < 2) {
    return runJudge(client, prompt, 2)
  }
  if (!parsed) {
    // Last-resort neutral fill so the rest of the report still works.
    return CATEGORIES.map((c) => ({
      category: c,
      score: 1,
      justification: 'JUDGE PARSE FAILURE - assigned neutral score; investigate this run',
    }))
  }
  // Ensure every category present.
  const byCat = new Map(parsed.map((s) => [s.category, s]))
  return CATEGORIES.map((c) => {
    const got = byCat.get(c)
    if (got && typeof got.score === 'number' && got.score >= 0 && got.score <= 3) {
      return { category: c, score: got.score, justification: String(got.justification || '') }
    }
    return { category: c, score: 1, justification: `MISSING from judge output - default to neutral` }
  })
}

function tryParse(raw: string): RubricScore[] | null {
  // Strip ```json fences if the judge added them despite instructions.
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end < 0) return null
    const obj = JSON.parse(cleaned.slice(start, end + 1))
    if (!obj || !Array.isArray(obj.scores)) return null
    return obj.scores as RubricScore[]
  } catch {
    return null
  }
}

function checkExpectations(scenario: ScenarioFixture, sim: SimulationResult): { pass: boolean; notes: string[] } {
  const notes: string[] = []
  const called = new Set(sim.tool_calls.map((t) => t.tool))
  for (const must of scenario.expectations.must_call || []) {
    if (!called.has(must)) notes.push(`MISSING required tool call: ${must}`)
  }
  for (const mustNot of scenario.expectations.must_not_call || []) {
    if (called.has(mustNot)) notes.push(`FORBIDDEN tool call fired: ${mustNot}`)
  }
  return { pass: notes.length === 0, notes }
}
