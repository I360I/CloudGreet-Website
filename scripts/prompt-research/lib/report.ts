/**
 * Render a markdown report for a completed run. The report is meant to
 * be read top-to-bottom: summary first, category breakdown, then the
 * worst-performing transcripts inline so a human can see what failed.
 */

import type { RunSummary, ScoredResult, RubricCategory } from './types'

const CATEGORIES: RubricCategory[] = [
  'booking_correctness',
  'information_completeness',
  'sms_consent_disclosure',
  'emergency_handling',
  'tone_naturalness',
  'hallucination_safety',
  'edge_case_handling',
]

export function renderReport(run: RunSummary): string {
  const lines: string[] = []
  lines.push(`# Prompt-research run`)
  lines.push('')
  lines.push(`- Started: ${run.started_at}`)
  lines.push(`- Finished: ${run.finished_at}`)
  lines.push(`- Generator SHA: \`${run.generator_sha}\``)
  lines.push(`- Total pairs: ${run.results.length}`)

  const overallAvg = avg(run.results.map((r) => r.overall))
  const passRate = pct(run.results.filter((r) => r.expectation_pass).length / run.results.length)
  lines.push(`- Overall score: **${pct(overallAvg)}**`)
  lines.push(`- Expectation pass rate: **${passRate}** (every must_call fired, no must_not_call fired)`)
  lines.push('')

  lines.push('## Scores by category')
  lines.push('')
  lines.push('| Category | Avg / 3 | Worst run |')
  lines.push('|---|---|---|')
  for (const cat of CATEGORIES) {
    const all = run.results.flatMap((r) => r.scores.filter((s) => s.category === cat))
    const a = avg(all.map((s) => s.score))
    const worst = run.results
      .map((r) => ({ id: `${r.business_id} × ${r.scenario_id}`, score: r.scores.find((s) => s.category === cat)?.score ?? 1 }))
      .sort((x, y) => x.score - y.score)[0]
    lines.push(`| ${cat} | ${a.toFixed(2)} | ${worst.id} (${worst.score}) |`)
  }
  lines.push('')

  lines.push('## Scores by scenario')
  lines.push('')
  lines.push('| Scenario | Avg / 1 | Expectations |')
  lines.push('|---|---|---|')
  const byScenario = groupBy(run.results, (r) => r.scenario_id)
  for (const [sid, rs] of Array.from(byScenario.entries())) {
    const a = avg(rs.map((r) => r.overall))
    const pass = rs.filter((r) => r.expectation_pass).length
    lines.push(`| ${sid} | ${a.toFixed(2)} | ${pass}/${rs.length} pass |`)
  }
  lines.push('')

  lines.push('## Scores by business')
  lines.push('')
  lines.push('| Business | Avg / 1 |')
  lines.push('|---|---|')
  const byBusiness = groupBy(run.results, (r) => r.business_id)
  for (const [bid, rs] of Array.from(byBusiness.entries())) {
    lines.push(`| ${bid} | ${avg(rs.map((r) => r.overall)).toFixed(2)} |`)
  }
  lines.push('')

  // Top 5 worst runs - inline transcripts so we can read them in the report.
  const worst = [...run.results].sort((a, b) => a.overall - b.overall).slice(0, 5)
  lines.push('## Worst-performing transcripts')
  for (const r of worst) {
    lines.push('')
    lines.push(`### ${r.business_id} × ${r.scenario_id} — overall ${r.overall.toFixed(2)}`)
    lines.push('')
    if (r.expectation_notes.length) {
      lines.push('Expectation issues:')
      for (const n of r.expectation_notes) lines.push(`- ${n}`)
      lines.push('')
    }
    lines.push('Scores:')
    for (const s of r.scores) lines.push(`- **${s.category}**: ${s.score}/3 — ${s.justification}`)
    lines.push('')
    if (r.tool_calls.length) {
      lines.push('Tool calls:')
      for (const tc of r.tool_calls) {
        lines.push('```')
        lines.push(`${tc.tool}(${JSON.stringify(tc.args)})`)
        lines.push('->')
        lines.push(JSON.stringify(tc.response))
        lines.push('```')
      }
    }
    lines.push('')
    lines.push('<details><summary>Transcript</summary>')
    lines.push('')
    lines.push('```')
    for (const t of r.transcript) lines.push(`${t.role.toUpperCase()}: ${t.text}`)
    lines.push('```')
    lines.push('')
    lines.push('</details>')
  }

  return lines.join('\n') + '\n'
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function pct(x: number): string {
  return (x * 100).toFixed(1) + '%'
}

function groupBy<T, K>(arr: T[], k: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const x of arr) {
    const key = k(x)
    if (!m.has(key)) m.set(key, [])
    m.get(key)!.push(x)
  }
  return m
}
