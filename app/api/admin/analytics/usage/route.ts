import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getUsageAnalytics } from '@/lib/analytics/usage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    // For admin users without businessId, return empty analytics
    // For admin users with businessId, return that business's analytics
    if (!auth.businessId) {
      // Return empty analytics for admin users without a specific business
      return NextResponse.json({
        success: true,
        analytics: {
          summary: {
            calls30: 0,
            calls7: 0,
            avgCallDuration: 0,
            appointments30: 0,
            outreach30: 0,
            pipelineRevenue: 0,
            conversionRate: 0
          },
          trends: [],
          churn: {
            riskLevel: 'low' as const,
            healthScore: 50,
            drivers: []
          },
          recentCalls: []
        }
      })
    }
    const analytics = await getUsageAnalytics(auth.businessId)
    return NextResponse.json({ success: true, analytics })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load usage analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


