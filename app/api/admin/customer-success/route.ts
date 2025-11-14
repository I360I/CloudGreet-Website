import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getCustomerSuccessSnapshot } from '@/lib/customer-success'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    // For admin users without businessId, return empty snapshot
    if (!auth.businessId) {
      return NextResponse.json({
        success: true,
        snapshot: {
          totalClients: 0,
          activeClients: 0,
          atRiskClients: 0,
          churnedClients: 0,
          recentSignups: [],
          atRisk: [],
          healthScores: []
        }
      })
    }
    const snapshot = await getCustomerSuccessSnapshot(auth.businessId)
    return NextResponse.json({ success: true, snapshot })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load customer success snapshot'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


