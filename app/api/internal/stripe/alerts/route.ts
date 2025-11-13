import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createBillingAlert, enqueueDunningSteps } from '@/lib/billing/ledger'

const alertSchema = z.object({
  tenantId: z.string().uuid(),
  invoiceId: z.string().optional().nullable(),
  alertType: z.enum(['invoice_failed', 'payment_action_required', 'threshold_exceeded']),
  message: z.string().min(5),
  metadata: z.record(z.any()).optional()
})

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const payload = alertSchema.parse(await request.json())
    await createBillingAlert({
      tenantId: payload.tenantId,
      invoiceId: payload.invoiceId ?? null,
      type: payload.alertType,
      message: payload.message,
      metadata: payload.metadata
    })

    if (payload.alertType === 'invoice_failed' && payload.invoiceId) {
      await enqueueDunningSteps({ tenantId: payload.tenantId, invoiceId: payload.invoiceId })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: error.flatten() }, { status: 422 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record billing alert' },
      { status: 500 }
    )
  }
}


