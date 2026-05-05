import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leads
 *
 * Returns the rep's view of the leads pool:
 *   · `claimed` — leads this rep has claimed (most recent first)
 *   · `available` — leads not yet claimed by anyone, capped at 50
 *
 * The `leads` table is populated by the scraper; reps work the rows
 * by claiming them, which inserts into `lead_assignments`.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { data: mineRows } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id, assigned_at, leads:lead_id(*)')
      .eq('rep_id', auth.userId)
      .order('assigned_at', { ascending: false })
      .limit(200)

    const claimed = (mineRows ?? []).map((r: any) => ({
      ...(r.leads || {}),
      claimed_at: r.assigned_at,
    })).filter((l: any) => l && l.id)

    const claimedIds = new Set<string>(claimed.map((l: any) => l.id))

    // Pull a generous slice of leads, then filter out any that have
    // an assignment row (claimed by anyone). Doing the anti-join in
    // SQL would need a view; for the volumes here (<10k leads) this
    // two-step is fine.
    const { data: assigned } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id')
      .limit(5000)

    const taken = new Set<string>((assigned ?? []).map((r: any) => r.lead_id))

    const { data: pool } = await supabaseAdmin
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    const available = (pool ?? [])
      .filter((l: any) => !taken.has(l.id) && !claimedIds.has(l.id))
      .slice(0, 50)

    return NextResponse.json({ success: true, claimed, available })
  } catch (e) {
    logger.error('List sales leads failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}
