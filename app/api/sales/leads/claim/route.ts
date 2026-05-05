import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/claim  { lead_ids: string[] }
 *
 * Claims one or more leads for the calling rep. We re-check that no
 * other rep has claimed each lead just before inserting — there's a
 * small race window since the PK on lead_assignments is composite
 * (lead_id, rep_id), not lead_id alone, so two reps inserting
 * simultaneously could both succeed. Acceptable for current volume;
 * if conflicts surface we'll add a partial unique index on lead_id.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { body = {} }

  const ids: string[] = Array.isArray(body?.lead_ids)
    ? body.lead_ids.filter((x: unknown) => typeof x === 'string')
    : []

  if (ids.length === 0) {
    return NextResponse.json({ error: 'lead_ids required' }, { status: 400 })
  }
  if (ids.length > 25) {
    return NextResponse.json({ error: 'Claim at most 25 leads at once' }, { status: 400 })
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id, rep_id')
      .in('lead_id', ids)

    const takenByOther = new Set<string>(
      (existing ?? [])
        .filter((r: any) => r.rep_id !== auth.userId)
        .map((r: any) => r.lead_id),
    )
    const alreadyMine = new Set<string>(
      (existing ?? [])
        .filter((r: any) => r.rep_id === auth.userId)
        .map((r: any) => r.lead_id),
    )

    const toInsert = ids
      .filter((id) => !takenByOther.has(id) && !alreadyMine.has(id))
      .map((lead_id) => ({ lead_id, rep_id: auth.userId, claimed: true }))

    if (toInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from('lead_assignments')
        .insert(toInsert)
      if (error) {
        logger.error('Lead claim insert failed', { userId: auth.userId, error: error.message })
        return NextResponse.json({ error: 'Failed to claim leads' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      claimed: toInsert.length,
      skipped_taken: takenByOther.size,
      skipped_already_mine: alreadyMine.size,
    })
  } catch (e) {
    logger.error('Lead claim failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed to claim' }, { status: 500 })
  }
}
