import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth-middleware'
import { getCommissionSummary } from '@/lib/sales/activity-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireEmployee(request, { allowManager: true })
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const scopeParam = searchParams.get('scope')

    const periodDays = period === '30d' ? 30 : period === '365d' ? 365 : 90
    const scope = scopeParam === 'team' ? 'team' : undefined

    const summary = await getCommissionSummary({
      userId: auth.userId,
      role: auth.role ?? 'user',
      businessId: auth.businessId,
      periodDays,
      scope
    })

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    logger.error('Failed to load commission summary', { error })
    return NextResponse.json({ error: 'Failed to load commission summary' }, { status: 500 })
  }
}


