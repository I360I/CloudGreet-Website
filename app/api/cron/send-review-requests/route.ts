import { NextRequest, NextResponse } from 'next/server'
import { sendDueReviewRequests } from '@/lib/review-requests'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron worker: GET /api/cron/send-review-requests
 *
 * Vercel cron schedule: every 15 minutes (see vercel.json).
 * Reads queued review_requests rows where scheduled_for <= now() and
 * fires the SMS via Telnyx. Idempotent and safe to overlap (worker
 * marks rows status='sent' before the next run sees them).
 *
 * Auth: Vercel cron sends a `x-vercel-cron-signature` header. We don't
 * verify it strictly; the endpoint is also protected by being a GET
 * with no real side effects unless rows are actually due. If you want
 * stricter auth later, add a CRON_SECRET env and check x-cron-secret.
 */
export async function GET(_request: NextRequest) {
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
