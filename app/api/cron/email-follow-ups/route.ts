import { NextRequest, NextResponse } from 'next/server'
import { sendFollowUps } from '@/lib/email-campaigns'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * GET /api/cron/email-follow-ups
 * Runs twice daily (9am + 3pm ET). Sends the next sequence step for any
 * email_lead whose next_follow_up_at has passed and replied_at is null.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await sendFollowUps()
    logger.info('email-follow-ups cron complete', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('email-follow-ups cron failed', { error: msg })
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
