import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/quality/resume { run_id }
 *
 * Re-kicks the /process chain for a run that stalled (function timeout,
 * cold-start hiccup, etc.). We only need this when a 'running' row's
 * last_progress_at is more than ~2 minutes old - the chain normally
 * self-heals via kickNext.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as { run_id?: string }
  if (!body.run_id) return NextResponse.json({ error: 'run_id required' }, { status: 400 })

  const { data: run } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('id, status')
    .eq('id', body.run_id)
    .maybeSingle()
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  if ((run as any).status !== 'running') {
    return NextResponse.json({ error: `Run is ${(run as any).status}, not running` }, { status: 400 })
  }

  // Heartbeat so the UI immediately shows progress, even if the chain
  // takes a few seconds to spin back up.
  await supabaseAdmin
    .from('prompt_eval_runs')
    .update({ last_progress_at: new Date().toISOString() })
    .eq('id', body.run_id)

  // Fire-and-forget the next /process call.
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
    body: JSON.stringify({ run_id: body.run_id }),
  }).catch((e) => {
    logger.warn('quality: failed to kick /process from resume', {
      runId: body.run_id, error: e instanceof Error ? e.message : String(e),
    })
  })

  return NextResponse.json({ success: true })
}
