import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/quality/runs/:id/export
 *
 * Bundles the entire eval run (metadata, every pair's transcript +
 * tool calls + scores, generated scenarios if client-mode, and the
 * Failure-Reading Agent diagnosis if analyzed) into a single Markdown
 * file the admin can download.
 *
 * No truncation - this is the dump-everything view. Browsers handle
 * multi-MB markdown fine.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const runId = params.id
  const { data: run, error: runErr } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle()
  if (runErr || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const { data: results } = await supabaseAdmin
    .from('prompt_eval_results')
    .select('*')
    .eq('run_id', runId)
    .order('overall_score', { ascending: true })

  const md = buildReport(run as any, (results || []) as any[])
  const filename = `cloudgreet-eval-${runId.slice(0, 8)}.md`
  return new NextResponse(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function buildReport(run: any, results: any[]): string {
  const lines: string[] = []
  const pct = (v: any) => (v != null ? `${(Number(v) * 100).toFixed(1)}%` : '—')
  const dollars = (m: any) => (m != null ? `$${(Number(m) / 1_000_000).toFixed(2)}` : '—')

  lines.push(`# CloudGreet eval run — ${run.id}`)
  lines.push('')
  lines.push(`- Started:   ${run.started_at || '—'}`)
  lines.push(`- Finished:  ${run.finished_at || '—'}`)
  lines.push(`- Status:    ${run.status}`)
  lines.push(`- Generator SHA: ${run.generator_sha || '—'}`)
  lines.push(`- Pairs:     ${run.completed_pairs}/${run.total_pairs}`)
  lines.push(`- Overall score: ${pct(run.overall_score)}`)
  lines.push(`- Expectation pass rate: ${pct(run.expectation_pass_rate)}`)
  lines.push(`- Cost: ${dollars(run.cost_micro)} (analysis: ${dollars(run.analysis_cost_micro)})`)
  if (run.notes) lines.push(`- Notes: ${run.notes}`)
  lines.push('')

  if (run.meta?.source === 'client') {
    lines.push('## Client tested')
    lines.push(`- Name: ${run.meta?.business_name || '—'}`)
    lines.push(`- business_id: ${run.meta?.business_id || '—'}`)
    if (run.meta?.client_fixture?.live_prompt) {
      lines.push(`- Live prompt: ${run.meta.client_fixture.live_prompt.length} chars (pulled from Retell)`)
    }
    if (run.meta?.client_fixture?.live_begin_message) {
      lines.push(`- Live greeting: "${run.meta.client_fixture.live_begin_message}"`)
    }
    lines.push('')
  }

  if (run.category_averages && typeof run.category_averages === 'object') {
    lines.push('## Scores by category')
    lines.push('')
    lines.push('| Category | Avg / 3 |')
    lines.push('|---|---|')
    for (const [k, v] of Object.entries(run.category_averages)) {
      lines.push(`| ${k} | ${Number(v).toFixed(2)} |`)
    }
    lines.push('')
  }

  // Pair-by-pair (worst first since results are already ordered).
  lines.push('## Pair results (worst → best)')
  lines.push('')
  for (const p of results) {
    lines.push(`### ${p.business_id} × ${p.scenario_id} — overall ${pct(p.overall_score)}`)
    lines.push('')
    lines.push(`- expectation_pass: ${p.expectation_pass}`)
    lines.push(`- stop_reason: ${p.stop_reason || '—'}`)
    lines.push(`- cost: ${dollars(p.cost_micro)}`)
    if (Array.isArray(p.expectation_notes) && p.expectation_notes.length) {
      lines.push('- expectation_notes:')
      for (const n of p.expectation_notes) lines.push(`  - ${n}`)
    }
    lines.push('')
    if (Array.isArray(p.scores) && p.scores.length) {
      lines.push('#### Judge scores')
      for (const s of p.scores) {
        lines.push(`- **${s.category}**: ${s.score}/3 — ${s.justification}`)
      }
      lines.push('')
    }
    if (Array.isArray(p.tool_calls) && p.tool_calls.length) {
      lines.push('#### Tool calls')
      for (const t of p.tool_calls) {
        lines.push(`- \`${t.tool}(${JSON.stringify(t.args)})\``)
        lines.push(`  → ${JSON.stringify(t.response)}`)
      }
      lines.push('')
    }
    if (Array.isArray(p.transcript) && p.transcript.length) {
      lines.push('#### Transcript')
      lines.push('```')
      for (const t of p.transcript) {
        lines.push(`${(t.role || '').toUpperCase()}: ${t.text}`)
      }
      lines.push('```')
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }

  // Generated scenarios for client-mode runs (if persisted in meta).
  const genScenarios = run.meta?.generated_scenarios
  if (Array.isArray(genScenarios) && genScenarios.length > 0) {
    lines.push('## Generated scenarios (client-tailored)')
    lines.push('')
    for (const s of genScenarios) {
      lines.push(`### ${s.id} — ${s.label || ''}`)
      lines.push('')
      lines.push(`**Persona:** ${s.persona || ''}`)
      lines.push('')
      lines.push(`**Opening line:** ${s.opening_line || ''}`)
      lines.push('')
      if (s.expectations) {
        if (s.expectations.must_call?.length) lines.push(`- must_call: ${s.expectations.must_call.join(', ')}`)
        if (s.expectations.must_not_call?.length) lines.push(`- must_not_call: ${s.expectations.must_not_call.join(', ')}`)
        if (s.expectations.checks?.length) {
          lines.push('- checks:')
          for (const c of s.expectations.checks) lines.push(`  - ${c}`)
        }
      }
      lines.push('')
    }
  }

  // Analyst diagnosis.
  if (run.analysis) {
    const a = run.analysis
    lines.push('## Failure-Reading Agent diagnosis')
    lines.push('')
    lines.push(`- generated_at: ${a.generated_at}`)
    lines.push(`- model: ${a.model}`)
    lines.push('')
    if (Array.isArray(a.prioritized_fixes) && a.prioritized_fixes.length) {
      lines.push('### Prioritized fixes')
      lines.push('')
      for (const f of a.prioritized_fixes) {
        lines.push(`**${f.rank}. ${f.title}** — \`${f.file}\``)
        lines.push('')
        lines.push(f.rationale)
        lines.push('')
        lines.push(`Est. impact: ${f.estimated_score_delta}`)
        if (f.suggested_diff_hint) {
          lines.push('')
          lines.push(`Hint: ${f.suggested_diff_hint}`)
        }
        lines.push('')
      }
    }
    if (Array.isArray(a.patterns) && a.patterns.length) {
      lines.push('### Cross-cutting patterns')
      lines.push('')
      for (const p of a.patterns) {
        lines.push(`- **[${(p.severity || '').toUpperCase()}]** ${p.pattern}`)
        if (p.affected_pairs?.length) lines.push(`  Affects: ${p.affected_pairs.join(', ')}`)
      }
      lines.push('')
    }
    if (Array.isArray(a.per_pair) && a.per_pair.length) {
      lines.push('### Per-pair diagnoses')
      lines.push('')
      for (const d of a.per_pair) {
        lines.push(`#### ${d.business_id} × ${d.scenario_id} (${pct(d.overall_score)})`)
        lines.push(`- Why it failed: ${d.why_it_failed}`)
        lines.push(`- Responsible source: ${d.responsible_source}`)
        lines.push(`- Recommended fix: ${d.recommended_fix}`)
        lines.push('')
      }
    }
  }

  return lines.join('\n')
}
