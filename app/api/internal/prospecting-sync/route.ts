import { NextRequest, NextResponse } from 'next/server'
import { runProspectSync } from '@/lib/prospecting/sync'
import { logger } from '@/lib/monitoring'

const CRON_SECRET = process.env.CRON_SECRET

export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest) {
  if (!CRON_SECRET) {
    return false
  }

  const headerSecret = request.headers.get('x-cron-secret')
  return headerSecret === CRON_SECRET
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await runProspectSync()
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    logger.error('Prospect sync invocation failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}


