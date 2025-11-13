import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { listTemplates, createTemplate } from '@/lib/prospecting/outreach-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') ?? auth.businessId ?? undefined
    const templates = await listTemplates(businessId ?? undefined)
    return NextResponse.json({ success: true, templates })
  } catch (error) {
    logger.error('Failed to list outreach templates', { error })
    return NextResponse.json({ error: 'Unable to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const template = await createTemplate(body, auth.businessId, auth.userId)
    return NextResponse.json({ success: true, template })
  } catch (error) {
    logger.error('Failed to create outreach template', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 400 }
    )
  }
}


