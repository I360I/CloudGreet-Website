import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { analyzeRun } from '@/scripts/prompt-research/lib/analyzer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Opus 4.7 with ~8K output on a fat prompt-source + bottom-K payload
// takes 30-60s. We don't want the function killed mid-call.
export const maxDuration = 120

/**
 * POST /api/admin/quality/runs/:id/analyze
 *
 * Runs the Failure-Reading Agent (Brain Piece 1) against a completed
 * eval run and writes the diagnosis back to prompt_eval_runs.analysis.
 * Identical logic to scripts/prompt-research/analyze.ts - shared via
 * scripts/prompt-research/lib/analyzer.ts.
 *
 * Returns the analysis JSON so the client can render immediately
 * without a follow-up GET.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const runId = params.id
  if (!runId) {
    return NextResponse.json({ error: 'runId required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const { analysis, costMicro } = await analyzeRun({
      supabase: supabaseAdmin as any,
      anthropic: new Anthropic({ apiKey }),
      runId,
      projectRoot: process.cwd(),
    })
    logger.info('admin/quality analyze ok', { runId, costMicro })
    return NextResponse.json({ success: true, analysis, cost_micro: costMicro })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'analyze failed'
    logger.error('admin/quality analyze failed', { runId, error: msg })
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
