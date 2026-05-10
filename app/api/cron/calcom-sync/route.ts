import { NextRequest, NextResponse } from 'next/server'
import { syncAllCalendars } from '@/lib/calcom-sync'
import { logger } from '@/lib/monitoring'
import { checkCronAuth } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron worker: GET /api/cron/calcom-sync
 *
 * Vercel cron schedule: every 30 minutes (see vercel.json).
 * Reconciles every connected business's Cal.com bookings into the local
 * appointments table. Backstop for the webhook so missed deliveries
 * (registration failure, network blip, manual booking inside Cal.com)
 * don't leave the dashboard stale.
 *
 * Auth: requires CRON_SECRET in production. The job hits Cal.com APIs
 * with every connected contractor's key - public exposure would let an
 * attacker fan out rate-limit pressure across the whole tenant base.
 */
export async function GET(request: NextRequest) {
  const denial = checkCronAuth(request)
  if (denial) {
    logger.warn('Unauthorized calcom-sync cron attempt', { reason: denial })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const start = Date.now()
  try {
    const summary = await syncAllCalendars()
    if (summary.totals.inserted + summary.totals.updated + summary.totals.errors > 0) {
      logger.info('calcom sync cron tick', {
        businesses: summary.businesses,
        inserted: summary.totals.inserted,
        updated: summary.totals.updated,
        skipped: summary.totals.skipped,
        errors: summary.totals.errors,
        ms: Date.now() - start,
      })
    }
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    logger.error('calcom sync cron threw', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ ok: false, error: 'cron_failed' }, { status: 500 })
  }
}
