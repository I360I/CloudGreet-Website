import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leads
 *
 * Returns the calling rep's leads with workflow state (status,
 * disposition, follow-up time, touch count, last 3 notes inlined).
 * Reps build their own list via scrape or CSV import — both
 * auto-claim into lead_assignments.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { data: rows } = await supabaseAdmin
      .from('lead_assignments')
      .select(`
        lead_id, assigned_at, status, disposition,
        follow_up_at, last_touched_at, touch_count,
        leads:lead_id(*)
      `)
      .eq('rep_id', auth.userId)
      .order('assigned_at', { ascending: false })
      .limit(2000)

    const leads = (rows ?? [])
      .map((r: any) => ({
        ...(r.leads || {}),
        claimed_at: r.assigned_at,
        status: r.status || 'new',
        disposition: r.disposition || null,
        follow_up_at: r.follow_up_at || null,
        last_touched_at: r.last_touched_at || null,
        touch_count: r.touch_count || 0,
      }))
      .filter((l: any) => l && l.id)

    // Inline last note per lead so the leads table can show a hint
    // without a roundtrip per row. Cap at most-recent 1 to keep
    // payload small; the detail view fetches the full thread.
    const ids = leads.map((l: any) => l.id)
    if (ids.length > 0) {
      const { data: notes } = await supabaseAdmin
        .from('lead_notes')
        .select('lead_id, body, created_at')
        .in('lead_id', ids)
        .eq('rep_id', auth.userId)
        .order('created_at', { ascending: false })
      const latestByLead = new Map<string, { body: string; created_at: string }>()
      for (const n of notes || []) {
        if (!latestByLead.has(n.lead_id)) {
          latestByLead.set(n.lead_id, { body: n.body, created_at: n.created_at })
        }
      }
      for (const lead of leads) {
        const note = latestByLead.get(lead.id)
        ;(lead as any).latest_note = note || null
      }
    }

    return NextResponse.json({ success: true, leads })
  } catch (e) {
    logger.error('List sales leads failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}
