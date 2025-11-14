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
    // For admin users without businessId, return empty snapshot with correct structure
    if (!auth.businessId) {
      return NextResponse.json({
        success: true,
        snapshot: {
          businessId: 'admin-view',
          businessName: 'Admin View',
          ownerName: null,
          ownerEmail: null,
          subscriptionStatus: 'N/A',
          accountAgeDays: 0,
          onboardingLagDays: 0,
          healthScore: 0,
          alerts: ['No business selected for detailed view.'],
          activation: {
            onboardingCompleted: false,
            onboardingStep: 0,
            calendarConnected: false,
            numberProvisioned: false,
            outreachRunning: false,
            firstCallHandled: false,
            createdAt: new Date().toISOString(),
            lastCallAt: null,
            lastOutreachAt: null,
            callsLast7Days: 0,
            outreachLast7Days: 0,
          },
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


