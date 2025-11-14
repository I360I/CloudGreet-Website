import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-middleware'
import { getReconciliationSummary, retryInvoicePayment } from '@/lib/billing/reconciliation'

const retrySchema = z.object({
  invoiceId: z.string().min(3)
})

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    // For admin users without businessId, return empty summary
    if (!auth.businessId) {
      return NextResponse.json({
        success: true,
        summary: {
          mrrCents: 0,
          bookingFeesCents: 0,
          creditsCents: 0,
          totalBilledCents: 0,
          openAlerts: [],
          pastDueInvoices: []
        }
      })
    }
    const summary = await getReconciliationSummary(auth.businessId)
    return NextResponse.json({ success: true, summary })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load billing summary' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = retrySchema.parse(await request.json())
    const result = await retryInvoicePayment(payload.invoiceId, auth.businessId)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 422 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry invoice' },
      { status: 500 }
    )
  }
}


