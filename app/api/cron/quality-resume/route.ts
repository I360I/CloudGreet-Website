import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Vercel Cron: resume any /admin/quality run that's gone stale.
 *
 * The fire-and-forget /process chain is fast when it works, but it
 * breaks the moment ONE function-times-out or ONE fetch fails to fire.
 * Rather than keep band-aiding the chain, this cron does a pull-loop:
 * every minute, find any 'running' run whose last_progress_at is more
 * than 60s old and kick /process for it. Self-healing - even if 5 in
 * a row die, the cron will keep restarting them until pending_matrix
 * drains.
 *
 * Wired in vercel.json:
 *   { "path": "/api/cron/quality-resume", "schedule": "*\/1 * * * *" }
 *
 * Auth: Vercel sets `Authorization: Bearer <CRON_SECRET>` on cron
 * invocations when CRON_SECRET is set in the project env. We allow
 * either that or no auth (so local-dev manual hits still work).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const got = request.headers.get('authorization')
    if (got !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 60s threshold = match the /process maxDuration cap. If a hop takes
  // longer than that, Vercel killed it - we want to resume.
  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const { data: stalled, error } = await supabaseAdmin
    .from('prompt_eval_runs')
    .select('id, last_progress_at, completed_pairs, total_pairs')
    .eq('status', 'running')
    .lt('last_progress_at', cutoff)
    .limit(5) // cron tick should resume at most a few - one at a time stays in budget

  if (error) {
    logger.warn('quality-resume cron: list failed', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const runs = stalled || []
  const origin = request.nextUrl.origin
  for (const r of runs) {
    const runId = (r as any).id
    // Heartbeat first so we don't double-kick on the next tick if this
    // takes a moment to land.
    await supabaseAdmin
      .from('prompt_eval_runs')
      .update({ last_progress_at: new Date().toISOString() })
      .eq('id', runId)
    // Fire /process with the cron secret as authorization. /process's
    // requireAdmin would normally reject this, so we mark it x-internal
    // and let the route's special case (added next) accept the cron.
    fetch(`${origin}/api/admin/quality/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
        'x-quality-cron': '1',
      },
      body: JSON.stringify({ run_id: runId }),
    }).catch((e) => {
      logger.warn('quality-resume cron: kick failed', { runId, error: e instanceof Error ? e.message : String(e) })
    })
    logger.info('quality-resume cron: kicked stalled run', { runId, completed: (r as any).completed_pairs, total: (r as any).total_pairs })
  }
  return NextResponse.json({ resumed: runs.length })
}
