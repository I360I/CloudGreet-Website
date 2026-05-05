import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { runWeeklyPayouts } from '@/lib/sales/run-weekly-payouts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * GET /api/cron/sales-payouts
 *
 * Vercel cron entry. Sweeps unpaid commission_ledger rows into a
 * Stripe Connect transfer per rep. Configured in vercel.json to
 * fire every Friday at 14:00 UTC (≈ 9 AM ET / 6 AM PT).
 *
 * Auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}` when
 * CRON_SECRET is configured in env.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron sales-payouts attempt', {
      hasAuthHeader: !!authHeader,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await runWeeklyPayouts()
    return NextResponse.json({ success: true, ...summary })
  } catch (e) {
    logger.error('Sales payouts cron failed', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Failed',
    }, { status: 500 })
  }
}
