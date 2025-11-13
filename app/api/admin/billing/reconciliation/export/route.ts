import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getReconciliationSummary } from '@/lib/billing/reconciliation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await getReconciliationSummary(auth.businessId)
    const csvRows = [
      ['Metric', 'Value'].join(','),
      ['MRR ($)', (summary.mrrCents / 100).toFixed(2)],
      ['Booking Fees ($)', (summary.bookingFeesCents / 100).toFixed(2)],
      ['Credits ($)', (summary.creditsCents / 100).toFixed(2)],
      ['Total Billed 30d ($)', (summary.totalBilledCents / 100).toFixed(2)]
    ]

    summary.openAlerts.forEach((alert) => {
      csvRows.push([
        `Alert: ${alert.alertType}`,
        `"${alert.message.replace(/"/g, '""')} (${alert.invoiceId ?? 'n/a'})"`
      ])
    })

    const body = csvRows.join('\n')
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="billing-summary-${auth.businessId}.csv"`
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export billing summary' },
      { status: 500 }
    )
  }
}


