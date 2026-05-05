import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { runWeeklyPayouts } from '@/lib/sales/run-weekly-payouts'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/admin/sales/payouts/run
 *
 * Admin-triggered payout sweep — same logic as the Friday cron.
 * Use it for an off-cycle payout, to backfill after a cron miss,
 * or to test the wiring end-to-end before relying on the schedule.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }
  try {
    const summary = await runWeeklyPayouts()
    return NextResponse.json({ success: true, ...summary })
  } catch (e) {
    logger.error('Manual payouts run failed', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Failed',
    }, { status: 500 })
  }
}
