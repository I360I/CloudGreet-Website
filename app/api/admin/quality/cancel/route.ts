import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/quality/cancel { run_id }
 *
 * Flips the run to 'cancelled'. The /process chain checks status on
 * each invocation and exits cleanly when it sees a non-'running' run,
 * so no extra termination logic is needed - the chain just stops on
 * the next hop.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as { run_id?: string }
  if (!body.run_id) {
    return NextResponse.json({ error: 'run_id required' }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from('prompt_eval_runs')
    .update({
      status: 'cancelled',
      finished_at: new Date().toISOString(),
      last_progress_at: new Date().toISOString(),
    })
    .eq('id', body.run_id)
    .eq('status', 'running')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
