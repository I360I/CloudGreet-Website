import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth-middleware'
import { getLeadDetail, updateLead } from '@/lib/sales/activity-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireEmployee(request, { allowManager: true })
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const lead = await getLeadDetail({
      prospectId: params.id,
      userId: auth.userId,
      role: auth.role ?? 'user',
      businessId: auth.businessId
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    logger.error('Failed to fetch lead detail', { error, prospectId: params.id })
    return NextResponse.json({ error: 'Failed to fetch lead detail' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireEmployee(request, { allowManager: true })
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    await updateLead({
      prospectId: params.id,
      userId: auth.userId,
      role: auth.role ?? 'user',
      businessId: auth.businessId,
      updates: {
        status: body.status,
        assignedTo: body.assignedTo,
        nextTouchAt: body.nextTouchAt,
        score: body.score,
        tags: body.tags
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to update lead', { error, prospectId: params.id })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lead' },
      { status: 400 }
    )
  }
}


