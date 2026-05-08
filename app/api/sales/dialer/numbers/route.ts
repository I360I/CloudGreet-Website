import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { listRepNumbers, orderRepNumber } from '@/lib/telnyx/rep-numbers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET  - list the rep's saved Telnyx numbers (max 3)
 * POST - order a new one. Body: { area_code?: string, label?: string }
 *        Auto-evicts the oldest non-active number if at the cap, and
 *        releases it from Telnyx so billing stops.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const numbers = await listRepNumbers(auth.userId)
  return NextResponse.json({ success: true, numbers, max: 3 })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    area_code?: string
    label?: string
  }
  const areaCode = body.area_code?.trim().replace(/\D/g, '').slice(0, 3) || undefined
  const label = body.label?.trim().slice(0, 40) || undefined

  const result = await orderRepNumber(auth.userId, { areaCode, label })
  if (result.ok !== true) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({
    success: true,
    created: result.created,
    evicted: result.evicted,
  })
}
