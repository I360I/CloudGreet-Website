import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getOutreachStats } from '@/lib/prospecting/outreach-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') ?? '7d'
    const stats = await getOutreachStats(auth.businessId ?? undefined, range)
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    logger.error('Failed to compute outreach stats', { error })
    return NextResponse.json({ error: 'Unable to load outreach metrics' }, { status: 500 })
  }
}


