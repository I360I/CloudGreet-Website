import { NextRequest, NextResponse } from 'next/server'
import { runOutreachRunner } from '@/lib/prospecting/outreach-runner'
import { logger } from '@/lib/monitoring'

const CRON_SECRET = process.env.CRON_SECRET

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  if (!CRON_SECRET) return false
  return request.headers.get('x-cron-secret') === CRON_SECRET
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await runOutreachRunner()
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    logger.error('Outreach runner failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}


