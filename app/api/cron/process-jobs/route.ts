import { NextRequest, NextResponse } from 'next/server'
import { processJobs } from '@/lib/job-queue'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Vercel Cron Job: Process Background Jobs
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-jobs",
 *     "schedule": "* * * * *"
 *   }]
 * }
 * 
 * Or use Vercel Dashboard: Settings > Cron Jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sets this header)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job attempt', {
        hasAuthHeader: !!authHeader,
        hasCronSecret: !!cronSecret
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10)
    const processed = await processJobs(limit)

    logger.info('Cron job processed', { processed, limit })

    return NextResponse.json({
      success: true,
      processed,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Cron job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Job processing failed' },
      { status: 500 }
    )
  }
}
