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
    logger.error('Failed to list outreach templates', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      businessId: searchParams.get('businessId') ?? auth.businessId ?? undefined
    })
    // Return empty array if table doesn't exist or other non-critical errors
    if (error instanceof Error && (
      error.message.includes('does not exist') || 
      error.message.includes('relation') ||
      error.message.includes('42P01')
    )) {
      return NextResponse.json({ success: true, templates: [] })
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unable to fetch templates' 
    }, { status: 500 })
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


