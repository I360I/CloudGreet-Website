import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { execSync } from 'node:child_process'
import { loadBusinesses, loadScenarios, buildMatrix } from '@/scripts/prompt-research/lib/load'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/admin/quality/start
 *
 * Body:
 *   - mode: 'smoke' | 'full' | 'custom'  (smoke=10, full=all, custom needs limit/only)
 *   - limit?: number
 *   - only?: string (scenario id)
 *   - business?: string (business id)
 *
 * Creates the prompt_eval_runs row in 'running' state with the full
 * pending matrix serialized, then kicks off /api/admin/quality/process
 * (fire-and-forget) to start chewing through pairs. Returns immediately
 * with the runId so the UI can switch to the live-progress view.
 *
 * One run at a time. If another run is already 'running', refuse so we
 * don't double-charge Anthropic.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    mode?: 'smoke' | 'full' | 'custom'
    limit?: number
    only?: string
    business?: string
  }
  const mode = body.mode || 'smoke'

  // Refuse if another run is in flight - keeps cost predictable and
  // avoids overlapping inserts into prompt_eval_results.
  const { data: active } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('id, started_at')
    .eq('status', 'running')
    .limit(1)
    .maybeSingle()
  if (active) {
    return NextResponse.json(
      { error: 'Another eval is already running', active_run_id: (active as any).id },
      { status: 409 },
    )
  }

  // Build the matrix from the on-disk banks.
  const businesses = loadBusinesses()
  const scenarios = loadScenarios()
  let matrix = buildMatrix(businesses, scenarios)
  if (body.only) matrix = matrix.filter((p) => p.scenario.id === body.only)
  if (body.business) matrix = matrix.filter((p) => p.business.id === body.business)
  if (mode === 'smoke') matrix = matrix.slice(0, 10)
  if (mode === 'custom' && body.limit) matrix = matrix.slice(0, body.limit)

  if (matrix.length === 0) {
    return NextResponse.json({ error: 'Matrix is empty for the given filters.' }, { status: 400 })
  }

  const sha = gitSha()
  const pending = matrix.map((p) => ({ business_id: p.business.id, scenario_id: p.scenario.id }))

  const { data: run, error } = await supabaseAdmin
    .from('prompt_eval_runs')
    .insert({
      status: 'running',
      total_pairs: matrix.length,
      generator_sha: sha,
      pending_matrix: pending,
      prompts_cache: {},
      notes: `mode=${mode}${body.only ? ' only=' + body.only : ''}${body.business ? ' business=' + body.business : ''}`,
    })
    .select('id')
    .single()
  if (error || !run) {
    return NextResponse.json({ error: error?.message || 'Failed to create run' }, { status: 500 })
  }
  const runId = (run as any).id as string

  // Fire-and-forget the first /process invocation. We don't await it -
  // the work happens in the background while the client polls.
  void kickProcess(request, runId)

  logger.info('quality eval started', { runId, totalPairs: matrix.length, mode })
  return NextResponse.json({ success: true, run_id: runId, total_pairs: matrix.length })
}

function gitSha(): string {
  // Vercel exposes the deploying commit SHA in VERCEL_GIT_COMMIT_SHA.
  const env = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA
  if (env) return env.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'no-git'
  }
}

async function kickProcess(request: NextRequest, runId: string): Promise<void> {
  const url = new URL('/api/admin/quality/process', request.nextUrl.origin)
  try {
    // Pass through the admin auth cookie + Authorization header so the
    // continuation call passes requireAdmin. We're calling our own API.
    const cookie = request.headers.get('cookie') || ''
    const authz = request.headers.get('authorization') || ''
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
    logger.warn('failed to kick first /process call', { runId, error: e instanceof Error ? e.message : String(e) })
  }
}
