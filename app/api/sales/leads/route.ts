import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leads
 *
 * Three-stage manual join - avoids PostgREST's foreign-key auto-join
 * because lead_assignments.lead_id has no declared FK to leads(id) in
 * the original schema. Doing the join in code is also more resilient
 * to optional columns.
 *
 *   1) lead_assignments      - required, must succeed
 *   2) leads                  - fetched by id list
 *   3) workflow + notes       - optional; if the migration isn't
 *      applied we just return defaults + migration_needed flag
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Stage 1 - assignments
  const { data: assignments, error: aErr } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id, assigned_at')
    .eq('rep_id', auth.userId)
    .order('assigned_at', { ascending: false })
    .limit(2000)

  if (aErr) {
    logger.error('Sales leads assignments query failed', {
      userId: auth.userId, error: aErr.message,
    })
    return NextResponse.json({
      error: `Couldn't load leads: ${aErr.message}`,
    }, { status: 500 })
  }

  const ids = (assignments ?? []).map((a) => a.lead_id).filter(Boolean) as string[]
  if (ids.length === 0) {
    return NextResponse.json({ success: true, leads: [] })
  }

  // Stage 2 - leads
  const { data: leadRows, error: lErr } = await supabaseAdmin
    .from('leads')
    .select('*')
    .in('id', ids)
    // Hide phone-less leads from the rep portal. The scraper now
    // refuses to create them, but old assignments may still point at
    // legacy rows with no phone.
    .not('phone', 'is', null)
    .neq('phone', '')
  if (lErr) {
    logger.error('Sales leads body query failed', {
      userId: auth.userId, error: lErr.message,
    })
    return NextResponse.json({
      error: `Couldn't load leads: ${lErr.message}`,
    }, { status: 500 })
  }

  const leadById = new Map<string, any>()
  for (const row of leadRows || []) leadById.set(row.id, row)

  // Stage 3 - optional workflow fields
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
        logger.warn('Sales leads workflow query failed', {
          userId: auth.userId, error: wErr.message,
        })
      }
    } else {
      for (const row of w || []) workflowMap.set(row.lead_id, row)
    }
  } catch (e) {
    migrationNeeded = 'sales-lead-workflow'
  }

  // Stage 3b - optional latest note per lead
  let latestNoteByLead = new Map<string, { body: string; created_at: string }>()
  try {
    const { data: notes, error: nErr } = await supabaseAdmin
      .from('lead_notes')
      .select('lead_id, body, created_at')
      .in('lead_id', ids)
      .eq('rep_id', auth.userId)
      .order('created_at', { ascending: false })
    if (!nErr && notes) {
      for (const n of notes) {
        if (!latestNoteByLead.has(n.lead_id)) {
          latestNoteByLead.set(n.lead_id, { body: n.body, created_at: n.created_at })
        }
      }
    }
  } catch { /* notes table may not exist yet - fine */ }

  // Merge - preserve assignments order (most-recent first)
  const leads = (assignments ?? [])
    .map((a) => {
      const lead = leadById.get(a.lead_id)
      if (!lead) return null
      const wf = workflowMap.get(a.lead_id) || {}
      const note = latestNoteByLead.get(a.lead_id)
      return {
        ...lead,
        claimed_at: a.assigned_at,
        status: wf.status || 'new',
        disposition: wf.disposition || null,
        follow_up_at: wf.follow_up_at || null,
        last_touched_at: wf.last_touched_at || null,
        touch_count: wf.touch_count || 0,
        latest_note: note || null,
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    success: true,
    leads,
    ...(migrationNeeded ? { migration_needed: migrationNeeded } : {}),
  }, {
    // The browser was caching this list, so after a rep changed a
    // disposition and navigated away + back, the reload served a stale
    // copy with the old 'new' statuses even though the DB was updated.
    // no-store forces a fresh read every time.
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
