import { NextRequest, NextResponse } from 'next/server'
import { enrichOwnerNames } from '@/lib/cold-outreach/owner-enrich'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Fills leads.contact_name for website-having leads with no decision-
 * maker name (everything outside the Texas license DBs). See
 * lib/cold-outreach/owner-enrich.ts. Bounded batch per run so a big
 * harvest backfills over days without hammering sites or timing out.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await enrichOwnerNames(8)
  logger.info('owner-name enrich run', result)
  return NextResponse.json({ success: true, ...result })
}
