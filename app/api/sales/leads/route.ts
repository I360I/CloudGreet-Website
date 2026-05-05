import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leads
 *
 * Two-stage load so a missing migration can never block the rep
 * from seeing their leads:
 *   1) bare query — lead_assignments + leads(*) only. This is the
 *      original schema and must always work; if it errors, surface
 *      the actual DB message so we can diagnose.
 *   2) workflow query — status, follow-up, touch count etc, layered
 *      on top of (1) by lead_id. If sql/sales-lead-workflow.sql
 *      hasn't been applied this errors silently and we return
 *      sensible defaults + migration_needed: 'sales-lead-workflow'.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Stage 1 — bare query
  const { data: bareRows, error: bareErr } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id, assigned_at, leads:lead_id(*)')
    .eq('rep_id', auth.userId)
    .order('assigned_at', { ascending: false })
    .limit(2000)

  if (bareErr) {
    logger.error('Sales leads bare query failed', {
      userId: auth.userId, error: bareErr.message,
    })
    return NextResponse.json({
      error: `Couldn't load leads: ${bareErr.message}`,
    }, { status: 500 })
  }

  // Stage 2 — workflow fields, optional. If the migration isn't
  // applied this query errors and we just return defaults.
  let workflowMap = new Map<string, any>()
  let migrationNeeded: string | null = null
  try {
    const { data: w, error: wErr } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id, status, disposition, follow_up_at, last_touched_at, touch_count')
      .eq('rep_id', auth.userId)
      .limit(2000)
    if (wErr) {
      if (/column.*does not exist|could not find/i.test(wErr.message)) {
        migrationNeeded = 'sales-lead-workflow'
      } else {
        logger.warn('Sales leads workflow query failed (using defaults)', {
          userId: auth.userId, error: wErr.message,
        })
      }
    } else {
      for (const row of w || []) workflowMap.set(row.lead_id, row)
    }
  } catch (e) {
    migrationNeeded = 'sales-lead-workflow'
  }

  const leads = (bareRows ?? [])
    .map((r: any) => {
      const wf = workflowMap.get(r.lead_id) || {}
      return {
        ...(r.leads || {}),
        claimed_at: r.assigned_at,
        status: wf.status || 'new',
        disposition: wf.disposition || null,
        follow_up_at: wf.follow_up_at || null,
        last_touched_at: wf.last_touched_at || null,
        touch_count: wf.touch_count || 0,
      }
    })
    .filter((l: any) => l && l.id)

  // Inline last note per lead (best-effort).
  const ids = leads.map((l: any) => l.id)
  if (ids.length > 0) {
    try {
      const { data: notes, error: nErr } = await supabaseAdmin
        .from('lead_notes')
        .select('lead_id, body, created_at')
        .in('lead_id', ids)
        .eq('rep_id', auth.userId)
        .order('created_at', { ascending: false })
      if (!nErr && notes) {
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
    } catch { /* notes is optional */ }
  }

  return NextResponse.json({
    success: true,
    leads,
    ...(migrationNeeded ? { migration_needed: migrationNeeded } : {}),
  })
}
