import { NextRequest, NextResponse } from 'next/server'
import { verifyOwnerNames } from '@/lib/cold-outreach/verify-owner'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * AI owner-name verification pass (see lib/cold-outreach/verify-owner.ts).
 * Claude re-reads each lead's website and confirms/corrects the owner
 * with a confidence level. Bounded batch per run.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await verifyOwnerNames(6)
  logger.info('owner-name verify run', result)
  return NextResponse.json({ success: true, ...result })
}
