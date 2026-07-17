import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { getRepDailyReport } from '@/lib/sales/dialer-stats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/setter/daily-report?days=14
 *
 * Per-day outcome breakdown for the signed-in setter so they can read their
 * own numbers and write an EoD without hand-counting. Newest day first.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'setter') {
    return NextResponse.json({ error: 'Setter role required' }, { status: 401 })
  }

  const raw = Number(new URL(request.url).searchParams.get('days') || '14')
  const days = Math.min(60, Math.max(1, Number.isFinite(raw) ? raw : 14))

  const report = await getRepDailyReport(auth.userId, days)
  return NextResponse.json(
    { success: true, report },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
