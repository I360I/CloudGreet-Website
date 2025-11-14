import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { runProspectSync } from '@/lib/prospecting/sync'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  await requireAdmin(request)

  try {
    const stats = await runProspectSync()
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    logger.error('Manual prospect sync failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}


