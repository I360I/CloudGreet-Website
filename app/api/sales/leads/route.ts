import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leads
 *
 * Returns the calling rep's leads. Reps build their own list via
 * scrape (auto-promoted at end of job) or CSV import — both insert
 * into lead_assignments under the rep's id.
 *
 * Tries the full workflow-aware query first (status, follow-up,
 * touch count, etc — added by sql/sales-lead-workflow.sql). If
 * those columns don't exist yet, falls back to the bare schema so
 * leads still show up; surfaces a `migration_needed` flag the UI
 * can display as a hint.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    let migrationNeeded = false
    let rows: any[] | null = null

    const full = await supabaseAdmin
      .from('lead_assignments')
      .select(`
        lead_id, assigned_at, status, disposition,
        follow_up_at, last_touched_at, touch_count,
        leads:lead_id(*)
      `)
      .eq('rep_id', auth.userId)
      .order('assigned_at', { ascending: false })
      .limit(2000)

    if (full.error) {
      // Workflow columns missing — fall back to bare schema so the
      // rep at least sees their leads.
      if (/column.*does not exist|could not find/i.test(full.error.message)) {
        migrationNeeded = true
        const fallback = await supabaseAdmin
          .from('lead_assignments')
          .select('lead_id, assigned_at, leads:lead_id(*)')
          .eq('rep_id', auth.userId)
          .order('assigned_at', { ascending: false })
          .limit(2000)
        if (fallback.error) {
          throw fallback.error
        }
        rows = fallback.data
      } else {
        throw full.error
      }
    } else {
      rows = full.data
    }

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
    // without a roundtrip per row. Only when notes table exists.
    const ids = leads.map((l: any) => l.id)
    if (ids.length > 0) {
      const { data: notes, error: notesErr } = await supabaseAdmin
        .from('lead_notes')
        .select('lead_id, body, created_at')
        .in('lead_id', ids)
        .eq('rep_id', auth.userId)
        .order('created_at', { ascending: false })
      if (!notesErr && notes) {
        const latestByLead = new Map<string, { body: string; created_at: string }>()
        for (const n of notes) {
          if (!latestByLead.has(n.lead_id)) {
            latestByLead.set(n.lead_id, { body: n.body, created_at: n.created_at })
          }
        }
        for (const lead of leads) {
          const note = latestByLead.get(lead.id)
          ;(lead as any).latest_note = note || null
        }
      }
    }

    return NextResponse.json({
      success: true,
      leads,
      ...(migrationNeeded ? { migration_needed: 'sales-lead-workflow' } : {}),
    })
  } catch (e) {
    logger.error('List sales leads failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}
