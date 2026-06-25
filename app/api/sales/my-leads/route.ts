import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/my-leads
 *
 * Returns the rep's assigned leads that have an email address.
 * Used by the email campaign "Add Leads" modal to let reps
 * pick from their pipeline to add to a campaign.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    // Get the rep's assigned lead IDs
    const { data: assignments, error: aErr } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id, status')
      .eq('rep_id', auth.userId)
      .order('assigned_at', { ascending: false })
      .limit(2000)

    if (aErr) {
      logger.error('my-leads assignments query failed', { userId: auth.userId, error: aErr.message })
      return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
    }

    const ids = (assignments ?? []).map((a) => a.lead_id).filter(Boolean) as string[]
    if (ids.length === 0) {
      return NextResponse.json({ success: true, leads: [] })
    }

    // Fetch all lead records (email-less leads shown in modal with "Find emails" option)
    const { data: leadRows, error: lErr } = await supabaseAdmin
      .from('leads')
      .select('id, business_name, contact_name, phone, email, city, website')
      .in('id', ids)

    if (lErr) {
      logger.error('my-leads body query failed', { userId: auth.userId, error: lErr.message })
      return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
    }

    // Build a status map from assignments (workflow status)
    const statusMap = new Map<string, string>()
    for (const a of assignments ?? []) {
      if (a.lead_id) statusMap.set(a.lead_id, a.status || 'new')
    }

    const leads = (leadRows ?? []).map((l) => ({
      ...l,
      status: statusMap.get(l.id) || 'new',
    }))

    return NextResponse.json({ success: true, leads })
  } catch (err) {
    logger.error('GET /api/sales/my-leads failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
