import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { getLedgerSummary, getOpenBillingAlerts, resolveBillingAlert } from '@/lib/billing/ledger'
import { getStripeClient } from '@/lib/billing/stripe-client'

export interface ReconciliationSummary {
  mrrCents: number
  bookingFeesCents: number
  creditsCents: number
  totalBilledCents: number
  openAlerts: Array<{
    id: string
    invoiceId: string | null
    alertType: string
    message: string
    createdAt: string
  }>
  pastDueInvoices: Array<{
    invoiceId: string
    amountDueCents: number
    dueDate: string | null
  }>
  nextInvoice?: {
    servicePeriodEnd: string | null
    estimatedTotalCents: number
  }
}

export async function getReconciliationSummary(tenantId: string): Promise<ReconciliationSummary> {
  const ledger = await getLedgerSummary(tenantId, 30)
  const openAlerts = await getOpenBillingAlerts(tenantId)

  const pastDueInvoices = openAlerts
    .filter((alert) => alert.alertType === 'invoice_failed' && alert.invoiceId)
    .map((alert) => ({
      invoiceId: alert.invoiceId!,
      amountDueCents: 0,
      dueDate: alert.createdAt
    }))

  const nextInvoice = ledger.entries
    .filter((entry) => entry.source === 'subscription')
    .sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1))[0]

  return {
    mrrCents: ledger.mrrCents,
    bookingFeesCents: ledger.bookingFeesCents,
    creditsCents: ledger.creditsCents,
    totalBilledCents: ledger.totalBilledCents,
    openAlerts,
    pastDueInvoices,
    nextInvoice: nextInvoice
      ? {
          servicePeriodEnd: nextInvoice.recordedAt,
          estimatedTotalCents: nextInvoice.amountCents
        }
      : undefined
  }
}

export async function retryInvoicePayment(invoiceId: string, tenantId: string) {
  let stripeCustomerId: string | null = null
  const { data: business, error: businessError } = await supabaseAdmin
    .from('businesses')
    .select('id, stripe_customer_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (businessError) {
    logger.error('Failed to locate business for invoice retry', { error: businessError.message, tenantId })
    throw new Error('Unable to verify business')
  }

  if (!business) {
    throw new Error('Business not found')
  }

  stripeCustomerId = business.stripe_customer_id ?? null

  try {
    const stripe = getStripeClient()
    const invoice = await stripe.invoices.retrieve(invoiceId)

    if (stripeCustomerId && invoice.customer && stripeCustomerId !== invoice.customer) {
      throw new Error('Invoice does not belong to this tenant')
    }

    const payment = await stripe.invoices.pay(invoiceId, {
      expand: ['payment_intent']
    })

    logger.info('Stripe invoice retry attempted', {
      invoiceId,
      tenantId,
      status: payment.status
    })

    const resolvedAlerts = await getOpenBillingAlerts(tenantId)
    for (const alert of resolvedAlerts) {
      if (alert.invoiceId === invoiceId) {
        await resolveBillingAlert(alert.id, tenantId)
      }
    }

    return {
      status: payment.status ?? 'unknown',
      paid: payment.status === 'paid'
    }
  } catch (error) {
    logger.error('Failed to retry invoice payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      invoiceId,
      tenantId
    })
    throw new Error('Failed to retry invoice payment')
  }
}


