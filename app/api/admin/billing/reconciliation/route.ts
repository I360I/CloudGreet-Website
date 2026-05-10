import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-middleware'
import { getReconciliationSummary, retryInvoicePayment } from '@/lib/billing/reconciliation'
import { getStripeMrrSummary } from '@/lib/billing/stripe-mrr'

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
 // Admin (no businessId): aggregate MRR live from Stripe across every
 // subscription. Comped (100%-off) subs are counted into MRR but tracked
 // separately so the UI can show paid/comped/past_due breakdown.
 if (!auth.businessId) {
  const stripeSummary = await getStripeMrrSummary()
  return NextResponse.json({
   success: true,
   summary: {
    mrrCents: stripeSummary.totalMrrCents,
    paidMrrCents: stripeSummary.paidMrrCents,
    compedMrrCents: stripeSummary.compedMrrCents,
    pastDueMrrCents: stripeSummary.pastDueMrrCents,
    paidCount: stripeSummary.paidCount,
    compedCount: stripeSummary.compedCount,
    pastDueCount: stripeSummary.pastDueCount,
    bookingFeesCents: 0,
    creditsCents: 0,
    totalBilledCents: stripeSummary.totalMrrCents,
    openAlerts: [],
    pastDueInvoices: [],
    subscriptions: stripeSummary.subscriptions,
    source: 'stripe-live',
   },
  })
 }
 const summary = await getReconciliationSummary(auth.businessId)
 return NextResponse.json({ success: true, summary: { ...summary, source: 'ledger' } })
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


