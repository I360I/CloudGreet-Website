import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/agents-due/bulk
 *   body: { action: 'archive' | 'unarchive' | 'delete', close_ids: string[] }
 *
 * Tidies the /admin/agents-due workspace. Archive is a soft-delete -
 * the close row stays, just gets a workshop_archived_at timestamp so
 * the queue stops surfacing it. Unarchive flips it back. Delete
 * removes the close row (and only the close row) from the archive;
 * the prospect's business, calls, agent, etc. are NOT touched - that
 * destructive flow lives at /admin/clients/[id]/delete.
 *
 * Idempotent: repeating an action with the same ids is a no-op.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    action?: string
    close_ids?: unknown
  } | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const action = body.action
  if (action !== 'archive' && action !== 'unarchive' && action !== 'delete') {
    return NextResponse.json({ error: 'action must be archive|unarchive|delete' }, { status: 400 })
  }

  const ids = Array.isArray(body.close_ids) ? body.close_ids.filter((id): id is string => typeof id === 'string' && id.length > 0) : []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'close_ids required' }, { status: 400 })
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: 'Too many ids in one request (max 200)' }, { status: 400 })
  }

  // Snapshot the rows BEFORE mutating so the audit row captures what
  // was touched even on partial failures.
  const { data: snapshot } = await supabaseAdmin
    .from('closes')
    .select('id, prospect_business_name, demo_scheduled_at, workshop_archived_at, status')
    .in('id', ids)
  const snapshotById = new Map<string, any>((snapshot || []).map((r: any) => [r.id, r]))

  const writeAudit = async (auditAction: string, extra?: Record<string, unknown>) => {
    try {
      await supabaseAdmin.from('admin_audit_events').insert({
        actor_user_id: auth.userId || null,
        action: auditAction,
        target_type: 'closes_bulk',
        target_id: null,
        reason: null,
        metadata: {
          close_ids: ids,
          rows: ids.map((id) => snapshotById.get(id) || { id, not_found: true }),
          ...(extra || {}),
        },
      })
    } catch (e) {
      logger.warn('agents-due bulk: audit insert failed (non-fatal)', {
        action: auditAction,
        error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  }

  try {
    if (action === 'archive') {
      const { error } = await supabaseAdmin
        .from('closes')
        .update({ workshop_archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      void writeAudit('closes_bulk_archive')
      return NextResponse.json({ success: true, archived: ids.length })
    }

    if (action === 'unarchive') {
      const { error } = await supabaseAdmin
        .from('closes')
        .update({ workshop_archived_at: null, updated_at: new Date().toISOString() })
        .in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      void writeAudit('closes_bulk_unarchive')
      return NextResponse.json({ success: true, unarchived: ids.length })
    }

    // Delete: only permitted on already-archived rows. Forces the two-
    // step "archive then delete" flow so an admin can't accidentally
    // wipe an active workshop row.
    const { data: archivedRows, error: lookupErr } = await supabaseAdmin
      .from('closes')
      .select('id, workshop_archived_at')
      .in('id', ids)
    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 })

    const deletable = (archivedRows || [])
      .filter((r) => (r as any).workshop_archived_at)
      .map((r) => r.id)
    const skipped = ids.length - deletable.length

    if (deletable.length === 0) {
      return NextResponse.json({
        error: 'Nothing to delete - archive these rows first.',
        skipped,
      }, { status: 400 })
    }

    const { error: delErr } = await supabaseAdmin
      .from('closes')
      .delete()
      .in('id', deletable)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    void writeAudit('closes_bulk_delete', { deletable, skipped })
    return NextResponse.json({ success: true, deleted: deletable.length, skipped })
  } catch (e) {
    logger.error('admin agents-due bulk failed', {
      action, count: ids.length,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 })
  }
}
