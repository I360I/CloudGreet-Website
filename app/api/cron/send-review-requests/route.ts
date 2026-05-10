import { NextRequest, NextResponse } from 'next/server'
import { sendDueReviewRequests } from '@/lib/review-requests'
import { logger } from '@/lib/monitoring'
import { checkCronAuth } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron worker: GET /api/cron/send-review-requests
 *
 * Vercel cron schedule: every 15 minutes (see vercel.json). Reads
 * queued review_requests rows where scheduled_for <= now() and fires
 * the SMS via Telnyx. Idempotent and safe to overlap (worker marks
 * rows status='sent' before the next run sees them). Cadence matters
 * because review requests are scheduled at specific local times
 * (1h_after / evening_same_day / next_morning) - daily would make
 * "evening same day" land the next morning UTC.
 *
 * Auth: requires CRON_SECRET in production. Without it, anyone could
 * fire SMS by hitting this endpoint.
 */
export async function GET(request: NextRequest) {
  const denial = checkCronAuth(request)
  if (denial) {
    logger.warn('Unauthorized review cron attempt', { reason: denial })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await sendDueReviewRequests({ batchSize: 50 })
    if (result.attempted > 0) {
      logger.info('review request cron tick', result)
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    logger.error('review request cron threw', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ ok: false, error: 'cron_failed' }, { status: 500 })
  }
}
