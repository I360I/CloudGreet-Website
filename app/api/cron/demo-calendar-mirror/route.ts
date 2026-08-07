import { NextRequest, NextResponse } from 'next/server'
import { mirrorDemoCalendars } from '@/lib/demo-calendar-mirror'
import { logger } from '@/lib/monitoring'
import { checkCronAuth } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron worker: GET /api/cron/demo-calendar-mirror
 *
 * Every 15 minutes (see vercel.json). Mirrors every rep's upcoming Cal.com
 * demos onto the owner's `cloudgreet` Cal.com hub, whose destination is his
 * Apple iCloud - so every demo lands on his Apple automatically. Idempotent +
 * self-healing via public.demo_calendar_mirrors.
 *
 * Auth: requires CRON_SECRET in production (hits Cal.com with every rep's key).
 * (redeploy trigger)
 */
export async function GET(request: NextRequest) {
  const denial = checkCronAuth(request)
  if (denial) {
    logger.warn('Unauthorized demo-calendar-mirror cron attempt', { reason: denial })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const start = Date.now()
  try {
    const summary = await mirrorDemoCalendars()
    if (summary.created + summary.cancelled + summary.completed + summary.errors > 0) {
      logger.info('demo-calendar-mirror tick', { ...summary, ms: Date.now() - start })
    }
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    logger.error('demo-calendar-mirror cron threw', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ ok: false, error: 'cron_failed' }, { status: 500 })
  }
}
