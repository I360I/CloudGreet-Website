import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createBillingAlert, enqueueDunningSteps } from '@/lib/billing/ledger'
import { logger } from '@/lib/monitoring'

const alertSchema = z.object({
 tenantId: z.string().uuid(),
 invoiceId: z.string().optional().nullable(),
 alertType: z.enum(['invoice_failed', 'payment_action_required', 'threshold_exceeded']),
 message: z.string().min(5),
 metadata: z.record(z.any()).optional()
})

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Shared-secret gate. Without auth, anyone could POST an arbitrary tenantId
// and spam fake "payment failed" alerts + trigger dunning steps for any
// business. The service_role/automation caller sends the CRON_SECRET; we
// fail closed in production when it isn't configured.
function authorized(request: NextRequest): boolean {
 const secret = process.env.CRON_SECRET
 if (!secret) return process.env.NODE_ENV !== 'production'
 const bearer = request.headers.get('authorization') === `Bearer ${secret}`
 const headerSecret = request.headers.get('x-cron-secret') === secret
 return bearer || headerSecret
}

export async function POST(request: NextRequest) {
 if (!authorized(request)) {
 return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
 }
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

 // Log the detail server-side; return a generic message so raw DB/Stripe
 // error strings (schema/table/column names) don't leak in the response.
 logger.error('stripe alerts endpoint failed', {
 error: error instanceof Error ? error.message : 'unknown',
 })
 return NextResponse.json({ error: 'Failed to record billing alert' }, { status: 500 })
 }
}


