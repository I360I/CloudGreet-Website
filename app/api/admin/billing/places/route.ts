import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { isGcpBillingConfigured, getPlacesSpendDashboard } from '@/lib/billing/gcp-billing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/billing/places
 *
 * Returns Google Places API spend pulled directly from the GCP
 * BigQuery billing export (real numbers, not estimates). Returns
 * a 503 with a configured: false flag if the GCP env vars aren't
 * set yet, or 503 with a hint if the export hasn't populated.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  if (!isGcpBillingConfigured()) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: 'GCP billing env vars not set (GCP_BILLING_PROJECT_ID / GCP_BILLING_DATASET / GCP_BILLING_SA_JSON).',
    }, { status: 503 })
  }

  try {
    const data = await getPlacesSpendDashboard()
    return NextResponse.json({ success: true, configured: true, ...data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    logger.warn('Places spend query failed', { error: msg })
    return NextResponse.json({
      success: false,
      configured: true,
      error: msg,
    }, { status: 503 })
  }
}
