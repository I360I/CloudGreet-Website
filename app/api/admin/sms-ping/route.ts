import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { pingSmsPipeline } from '@/lib/sms-agent'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  try {
    const result = await pingSmsPipeline(businessId)
    return NextResponse.json(result)
  } catch (e) {
    logger.error('sms-ping failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ ok: false, error: 'internal_error', ms: 0 }, { status: 500 })
  }
}
