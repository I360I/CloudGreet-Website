import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_STATUSES = new Set([
  'new', 'called', 'voicemail', 'interested', 'demo_scheduled',
  'proposal_sent', 'closed', 'dead', 'do_not_call',
])

/**
 * Bulk operations for the rep's lead list.
 *
 * PATCH /api/sales/leads/bulk
 *   body: { ids: string[], status: string, touched?: boolean }
 *   - Updates lead_assignments.status for every owned (id ∈ ids) row.
 *   - Reps can only mutate their own assignments (rep_id = auth.userId).
 *
 * DELETE /api/sales/leads/bulk
 *   body: { ids: string[] }
 *   - Unassigns: drops rep_id's claim on each lead. Lead row stays so
 *     other reps don't lose history; just removed from this rep's view.
 */

async function authedRep(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return { ok: false as const, repId: null }
  }
  return { ok: true as const, repId: auth.userId }
}

export async function PATCH(request: NextRequest) {
  const a = await authedRep(request)
  if (!a.ok) return NextResponse.json({ error: 'Sales role required' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    ids?: string[]; status?: string; touched?: boolean
  }
  const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === 'string') : []
  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })
  if (!body.status || !ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const update: Record<string, unknown> = { status: body.status }
  if (body.touched) update.last_touched_at = new Date().toISOString()

  const { error, count } = await supabaseAdmin
    .from('lead_assignments')
    .update(update, { count: 'exact' })
    .in('lead_id', ids)
    .eq('rep_id', a.repId)
  if (error) {
    logger.error('bulk lead patch failed', { error: error.message, repId: a.repId })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: count ?? 0 })
}

export async function DELETE(request: NextRequest) {
  const a = await authedRep(request)
  if (!a.ok) return NextResponse.json({ error: 'Sales role required' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { ids?: string[] }
  const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === 'string') : []
  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const { error, count } = await supabaseAdmin
    .from('lead_assignments')
    .delete({ count: 'exact' })
    .in('lead_id', ids)
    .eq('rep_id', a.repId)
  if (error) {
    logger.error('bulk lead delete failed', { error: error.message, repId: a.repId })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, removed: count ?? 0 })
}
