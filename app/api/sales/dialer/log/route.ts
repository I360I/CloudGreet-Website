import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST  /api/sales/dialer/log
 *   body: { lead_id?, to_number, from_number?, telnyx_call_id?, status }
 *   Creates a rep_calls row when a call starts.
 *
 * PATCH /api/sales/dialer/log
 *   body: { id, status, ended_at?, duration_seconds?, notes? }
 *   Updates the row when the call ends. Also bumps lead_assignments
 *   touch_count + last_touched_at when lead_id is set, so the lead
 *   moves out of the "untouched" sort.
 */

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as {
    lead_id?: string
    to_number?: string
    from_number?: string
    telnyx_call_id?: string
    status?: string
  }
  const to = (body.to_number || '').trim()
  if (!to) return NextResponse.json({ error: 'to_number required' }, { status: 400 })

  try {
    const { data, error } = await supabaseAdmin
      .from('rep_calls')
      .insert({
        rep_id: auth.userId,
        lead_id: body.lead_id || null,
        to_number: to,
        from_number: body.from_number || null,
        telnyx_call_id: body.telnyx_call_id || null,
        status: body.status || 'ringing',
      })
      .select('id')
      .single()
    if (error) {
      return NextResponse.json({
        error: 'Could not log - run sql/rep-calls.sql',
      }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: data.id })
  } catch (e) {
    logger.error('dialer log POST failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as {
    id?: string
    status?: string
    ended_at?: string
    duration_seconds?: number
    notes?: string
  }
  const id = (body.id || '').trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, any> = {}
  if (body.status) update.status = body.status
  if (body.ended_at) update.ended_at = body.ended_at
  if (typeof body.duration_seconds === 'number') update.duration_seconds = body.duration_seconds
  if (body.notes !== undefined) update.notes = body.notes

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    // Scope by rep so a rep can't tamper with another rep's row.
    const { data, error } = await supabaseAdmin
      .from('rep_calls')
      .update(update)
      .eq('id', id)
      .eq('rep_id', auth.userId)
      .select('lead_id, status')
      .maybeSingle()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Bump the lead's touch count + last_touched_at so it moves out of
    // the "untouched" sort and the workflow status filter sees it.
    if (data?.lead_id && (update.status === 'completed' || update.status === 'no_answer' || update.status === 'voicemail')) {
      const nowIso = new Date().toISOString()
      // Read current touch_count to avoid a race with the rep flipping
      // the status manually; we increment here rather than using
      // postgres' atomic increment so the same row update can fail
      // back to the simpler upsert path on older deploys without the
      // workflow migration.
      const { data: cur } = await supabaseAdmin
        .from('lead_assignments')
        .select('touch_count')
        .eq('rep_id', auth.userId)
        .eq('lead_id', data.lead_id)
        .maybeSingle()
      await supabaseAdmin
        .from('lead_assignments')
        .update({
          touch_count: ((cur as any)?.touch_count ?? 0) + 1,
          last_touched_at: nowIso,
        })
        .eq('rep_id', auth.userId)
        .eq('lead_id', data.lead_id)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('dialer log PATCH failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
