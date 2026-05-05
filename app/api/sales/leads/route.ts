import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leads
 *
 * Returns the calling rep's leads only. There's no shared pool —
 * reps build their own lists by running scrapes or importing
 * CSVs, both of which auto-claim into lead_assignments.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { data: rows } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id, assigned_at, leads:lead_id(*)')
      .eq('rep_id', auth.userId)
      .order('assigned_at', { ascending: false })
      .limit(1000)

    const leads = (rows ?? [])
      .map((r: any) => ({ ...(r.leads || {}), claimed_at: r.assigned_at }))
      .filter((l: any) => l && l.id)

    return NextResponse.json({ success: true, leads })
  } catch (e) {
    logger.error('List sales leads failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}
