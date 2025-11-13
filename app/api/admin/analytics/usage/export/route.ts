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
    const csvRows = [
      ['Metric', 'Value'].join(','),
      ['Calls (30d)', analytics.summary.calls30],
      ['Calls (7d)', analytics.summary.calls7],
      ['Average Call Duration (sec)', analytics.summary.avgCallDuration],
      ['Appointments (30d)', analytics.summary.appointments30],
      ['Outreach Touches (30d)', analytics.summary.outreach30],
      ['Pipeline Revenue (30d)', analytics.summary.pipelineRevenue],
      ['Conversion Rate (%)', analytics.summary.conversionRate],
      ['Health Score', analytics.churn.healthScore],
      ['Churn Risk', analytics.churn.riskLevel]
    ]

    analytics.churn.drivers.forEach((driver) => {
      csvRows.push([`Driver`, `"${driver.replace(/"/g, '""')}"`].join(','))
    })

    return new NextResponse(csvRows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="usage-analytics-${auth.businessId}.csv"`
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export usage analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


