import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth-middleware'
import { listEmployeeLeads } from '@/lib/sales/activity-service'
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
    const status = searchParams.get('status') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const scopeParam = searchParams.get('scope')
    const limitParam = searchParams.get('limit')

    const scope = scopeParam === 'team' ? 'team' : 'self'
    const limit = limitParam ? Math.min(Number(limitParam) || 50, 200) : undefined

    const data = await listEmployeeLeads({
      userId: auth.userId,
      businessId: auth.businessId,
      role: auth.role ?? 'user',
      status,
      search,
      scope,
      limit
    })

    return NextResponse.json({
      success: true,
      leads: data.leads,
      stats: data.stats
    })
  } catch (error) {
    logger.error('Failed to load employee leads', { error })
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}


