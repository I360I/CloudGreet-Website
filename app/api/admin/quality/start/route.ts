import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { execSync } from 'node:child_process'
import { loadBusinesses, loadScenarios, buildMatrix } from '@/scripts/prompt-research/lib/load'
import { loadClientFixture } from '@/scripts/prompt-research/lib/client-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/admin/quality/start
 *
 * Body:
 *   - mode: 'smoke' | 'full' | 'custom' | 'client'
 *       smoke  = 10 synthetic pairs (cheap, fast)
 *       full   = every synthetic (business, scenario) pair
 *       client = all 12 scenarios run against ONE real client's
 *                generated prompt (set business_id)
 *   - business_id?: string  (required for mode='client')
 *   - limit?: number
 *   - only?: string (scenario id)
 *   - business?: string (synthetic business id, for filtering)
 *
 * Creates a prompt_eval_runs row in 'running' state and kicks off the
 * /process chain. Returns immediately with the runId so the UI can
 * switch to the live-progress view.
 *
 * One run at a time - if another run is already 'running', refuse.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    mode?: 'smoke' | 'full' | 'custom' | 'client'
    limit?: number
    only?: string
    business?: string
    business_id?: string
    runner?: 'web' | 'local'
  }
  const mode = body.mode || 'smoke'
  const runner = body.runner === 'local' ? 'local' : 'web'

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

  // Build the matrix. mode='client' takes a single business and runs
  // every applicable scenario against it; everything else uses the
  // synthetic on-disk banks.
  const scenarios = loadScenarios()
  let matrix: Array<{ business: { id: string }; scenario: { id: string } }> = []
  let meta: Record<string, any> = {}

  if (mode === 'client') {
    if (!body.business_id) {
      return NextResponse.json({ error: 'business_id required for mode=client' }, { status: 400 })
    }
    let clientFixture
    try {
      clientFixture = await loadClientFixture(body.business_id)
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load client' }, { status: 400 })
    }
    // Run every scenario against this one client. Scenarios with an
    // applies_to filter that doesn't include 'client-*' still run -
    // applies_to was authored against synthetic business ids.
    for (const s of scenarios) {
      matrix.push({ business: { id: clientFixture.id }, scenario: { id: s.id } })
    }
    meta = {
      source: 'client',
      business_id: body.business_id,
      business_name: clientFixture.context.business.name,
      client_fixture: clientFixture,
      runner,
    }
  } else {
    const businesses = loadBusinesses()
    let mx = buildMatrix(businesses, scenarios)
    if (body.only) mx = mx.filter((p) => p.scenario.id === body.only)
    if (body.business) mx = mx.filter((p) => p.business.id === body.business)
    if (mode === 'smoke') mx = mx.slice(0, 10)
    if (mode === 'custom' && body.limit) mx = mx.slice(0, body.limit)
    matrix = mx
    meta = { source: 'synthetic', mode, runner }
  }

  if (matrix.length === 0) {
    return NextResponse.json({ error: 'Matrix is empty for the given filters.' }, { status: 400 })
  }

  const sha = gitSha()
  const pending = matrix.map((p) => ({ business_id: p.business.id, scenario_id: p.scenario.id }))

  const noteSuffix = mode === 'client'
    ? ` business_id=${body.business_id}`
    : `${body.only ? ' only=' + body.only : ''}${body.business ? ' business=' + body.business : ''}`

  const { data: run, error } = await supabaseAdmin
    .from('prompt_eval_runs')
    .insert({
      status: 'running',
      total_pairs: matrix.length,
      generator_sha: sha,
      pending_matrix: pending,
      prompts_cache: {},
      meta,
      notes: `mode=${mode}${noteSuffix}`,
    })
    .select('id')
    .single()
  if (error || !run) {
    return NextResponse.json({ error: error?.message || 'Failed to create run' }, { status: 500 })
  }
  const runId = (run as any).id as string

  // Local runs are picked up by the local runner daemon polling
  // Supabase - we do NOT kick the Vercel chain in that case.
  if (runner === 'web') {
    kickProcess(request, runId)
  }

  logger.info('quality eval started', { runId, totalPairs: matrix.length, mode, runner })
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

function kickProcess(request: NextRequest, runId: string): void {
  // Fire-and-forget. We must NOT await fetch here - if we do, the
  // Vercel function holds the response to the caller open until the
  // continuation request completes, which can take 30s+. Returning
  // synchronously lets /start respond in ~1s and the chain runs in
  // the background.
  const url = new URL('/api/admin/quality/process', request.nextUrl.origin)
  const cookie = request.headers.get('cookie') || ''
  const authz = request.headers.get('authorization') || ''
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
    logger.warn('failed to kick first /process call', { runId, error: e instanceof Error ? e.message : String(e) })
  })
}
