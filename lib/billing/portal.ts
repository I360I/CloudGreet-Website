import { supabaseAdmin } from '@/lib/supabase'
import { getStripeClient } from '@/lib/billing/stripe-client'
import { logger } from '@/lib/monitoring'

export async function createCustomerPortalSession(tenantId: string, returnUrl: string) {
  const { data: business, error } = await supabaseAdmin
    .from('businesses')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (error) {
    logger.error('Failed to fetch business for portal session', { error: error.message, tenantId })
    throw new Error('Unable to load billing profile')
  }

  if (!business?.stripe_customer_id) {
    throw new Error('No Stripe customer on file for this tenant')
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: returnUrl
    })

    return session.url
  } catch (error) {
    logger.error('Failed to create Stripe portal session', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId
    })
    throw new Error('Unable to create customer portal session')
  }
}

export async function resendInvoicePaymentLink(invoiceId: string) {
  try {
    const stripe = getStripeClient()
    const invoice = await stripe.invoices.retrieve(invoiceId)

    if (!invoice?.id) {
      throw new Error('Invoice not found')
    }

    await stripe.invoices.sendInvoice(invoice.id)
    return { invoiceId: invoice.id, status: invoice.status }
  } catch (error) {
    logger.error('Failed to resend invoice payment link', {
      error: error instanceof Error ? error.message : 'Unknown error',
      invoiceId
    })
    throw new Error('Failed to resend payment link')
  }
}


