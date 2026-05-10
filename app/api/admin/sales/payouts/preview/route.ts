import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { previewWeeklyPayouts } from '@/lib/sales/preview-payouts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/sales/payouts/preview
 *
 * Read-only dry-run of the Friday payout sweep. Returns each rep's
 * projected amount, skip reason if any, and connect-readiness flags.
 * No Stripe calls, no DB writes.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }
  try {
    const summary = await previewWeeklyPayouts()
    return NextResponse.json({ success: true, ...summary })
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Failed',
    }, { status: 500 })
  }
}
