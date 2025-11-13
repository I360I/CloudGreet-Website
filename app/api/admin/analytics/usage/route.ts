import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getUsageAnalytics } from '@/lib/analytics/usage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const analytics = await getUsageAnalytics(auth.businessId)
    return NextResponse.json({ success: true, analytics })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load usage analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


