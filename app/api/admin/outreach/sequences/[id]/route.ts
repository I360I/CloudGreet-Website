import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getSequence, updateSequence, deleteSequence } from '@/lib/prospecting/outreach-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const sequence = await getSequence(params.id, auth.businessId ?? undefined)
    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, sequence })
  } catch (error) {
    logger.error('Failed to fetch outreach sequence', { error })
    return NextResponse.json({ error: 'Unable to load sequence' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const sequence = await updateSequence(params.id, body, auth.businessId ?? undefined)
    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, sequence })
  } catch (error) {
    logger.error('Failed to update outreach sequence', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update sequence' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    await deleteSequence(params.id, auth.businessId ?? undefined)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete outreach sequence', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete sequence' },
      { status: 400 }
    )
  }
}


