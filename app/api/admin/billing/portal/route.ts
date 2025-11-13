import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-middleware'
import { createCustomerPortalSession, resendInvoicePaymentLink } from '@/lib/billing/portal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const payloadSchema = z.object({
  action: z.enum(['portal', 'resend_invoice']),
  invoiceId: z.string().optional()
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = payloadSchema.parse(await request.json())
    if (payload.action === 'portal') {
      const returnUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.cloudgreet.com'
      const url = await createCustomerPortalSession(auth.businessId, returnUrl)
      return NextResponse.json({ success: true, url })
    }

    if (!payload.invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 422 })
    }

    const result = await resendInvoicePaymentLink(payload.invoiceId)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 422 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process billing request' },
      { status: 500 }
    )
  }
}


