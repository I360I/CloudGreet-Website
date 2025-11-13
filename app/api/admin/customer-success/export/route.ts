import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getCustomerSuccessSnapshot } from '@/lib/customer-success'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const snapshot = await getCustomerSuccessSnapshot(auth.businessId)
    const csvRows = [
      ['Business', 'Owner', 'Owner Email', 'Subscription', 'Health Score', 'Onboarding Completed', 'Calendar Connected', 'Number Provisioned', 'Outreach Running', 'First Call Handled', 'Calls Last 7 Days', 'Outreach Last 7 Days', 'Alerts']
        .join(','),
      [
        `"${snapshot.businessName}"`,
        `"${snapshot.ownerName ?? ''}"`,
        `"${snapshot.ownerEmail ?? ''}"`,
        snapshot.subscriptionStatus ?? 'unknown',
        snapshot.healthScore,
        snapshot.activation.onboardingCompleted ? 'yes' : 'no',
        snapshot.activation.calendarConnected ? 'yes' : 'no',
        snapshot.activation.numberProvisioned ? 'yes' : 'no',
        snapshot.activation.outreachRunning ? 'yes' : 'no',
        snapshot.activation.firstCallHandled ? 'yes' : 'no',
        snapshot.activation.callsLast7Days,
        snapshot.activation.outreachLast7Days,
        `"${snapshot.alerts.join(' | ')}"`
      ].join(',')
    ]

    return new NextResponse(csvRows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="customer-health-${snapshot.businessId}.csv"`
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export customer success snapshot'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


