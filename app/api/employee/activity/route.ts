import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth-middleware'
import { listSalesActivities, logSalesActivity } from '@/lib/sales/activity-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireEmployee(request, { allowManager: true })
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const prospectId = searchParams.get('prospectId')
  const limitParam = searchParams.get('limit')

  if (!prospectId) {
    return NextResponse.json({ error: 'prospectId is required' }, { status: 400 })
  }

  try {
    const activities = await listSalesActivities({
      prospectId,
      userId: auth.userId,
      role: auth.role ?? 'user',
      businessId: auth.businessId,
      limit: limitParam ? Number(limitParam) : undefined
    })

    return NextResponse.json({ success: true, activities })
  } catch (error) {
    logger.error('Failed to load sales activities', { error })
    return NextResponse.json({ error: 'Failed to load activities' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireEmployee(request, { allowManager: true })
  if (!auth.success || !auth.userId || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    if (!body?.prospectId || !body?.activityType) {
      return NextResponse.json(
        { error: 'prospectId and activityType are required' },
        { status: 400 }
      )
    }

    const result = await logSalesActivity({
      businessId: auth.businessId,
      prospectId: body.prospectId,
      userId: auth.userId,
      activityType: body.activityType,
      direction: body.direction,
      outcome: body.outcome,
      notes: body.notes,
      loggedAt: body.loggedAt,
      followUpAt: body.followUpAt,
      metadata: body.metadata,
      updateStatus: body.updateStatus,
      commissionAmount: body.commissionAmount,
      commissionDescription: body.commissionDescription
    })

    return NextResponse.json({ success: true, activityId: result.activityId })
  } catch (error) {
    logger.error('Failed to log sales activity', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log activity' },
      { status: 400 }
    )
  }
}


