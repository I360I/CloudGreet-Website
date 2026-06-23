import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { runSmsHealthCheck } from '@/lib/sms-health'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || undefined
    const windowHours = parseInt(searchParams.get('windowHours') || '24', 10)

    const report = await runSmsHealthCheck({ windowHours, businessId })
    return NextResponse.json(report)
  } catch (e) {
    logger.error('admin sms-health failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
