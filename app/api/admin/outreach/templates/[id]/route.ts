import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { updateTemplate, deleteTemplate } from '@/lib/prospecting/outreach-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const template = await updateTemplate(params.id, body, auth.businessId ?? undefined)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, template })
  } catch (error) {
    logger.error('Failed to update outreach template', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template' },
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
    await deleteTemplate(params.id, auth.businessId ?? undefined)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete outreach template', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 400 }
    )
  }
}


