import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export type LedgerSource = 'subscription' | 'booking_fee' | 'credit_adjustment'

export interface LedgerEntryInput {
  tenantId: string
  source: LedgerSource
  amountCents: number
  description: string
  currency?: string
  stripeInvoiceId?: string | null
  stripeSubscriptionId?: string | null
  stripeChargeId?: string | null
  servicePeriodStart?: string | null
  servicePeriodEnd?: string | null
  metadata?: Record<string, unknown>
}

export async function recordLedgerEntry(entry: LedgerEntryInput) {
  const payload = {
    tenant_id: entry.tenantId,
    source: entry.source,
    amount_cents: Math.round(entry.amountCents),
    currency: entry.currency ?? 'usd',
    description: entry.description,
    stripe_invoice_id: entry.stripeInvoiceId ?? null,
    stripe_subscription_id: entry.stripeSubscriptionId ?? null,
    stripe_charge_id: entry.stripeChargeId ?? null,
    service_period_start: entry.servicePeriodStart ?? null,
    service_period_end: entry.servicePeriodEnd ?? null,
    metadata: entry.metadata ?? {}
  }

  const { error } = await supabaseAdmin.from('billing_usage_ledger').insert(payload)
  if (error) {
    logger.error('Failed to record ledger entry', { error: error.message, tenantId: entry.tenantId })
    throw new Error('Failed to record ledger entry')
  }
}

export interface LedgerSummary {
  mrrCents: number
  bookingFeesCents: number
  creditsCents: number
  totalBilledCents: number
  entries: Array<{
    id: string
    amountCents: number
    description: string
    source: LedgerSource
    recordedAt: string
    invoiceId: string | null
  }>
}

export async function getLedgerSummary(tenantId: string, days = 30): Promise<LedgerSummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('billing_usage_ledger')
    .select('id, amount_cents, source, description, stripe_invoice_id, recorded_at')
    .eq('tenant_id', tenantId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false })

  if (error) {
    logger.error('Failed to load ledger summary', { error: error.message, tenantId })
    throw new Error('Failed to load ledger summary')
  }

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    amountCents: row.amount_cents,
    source: row.source as LedgerSource,
    description: row.description ?? '',
    invoiceId: row.stripe_invoice_id,
    recordedAt: row.recorded_at
  }))

  const mrrCents = entries
    .filter((entry) => entry.source === 'subscription')
    .reduce((sum, entry) => sum + entry.amountCents, 0)

  const bookingFeesCents = entries
    .filter((entry) => entry.source === 'booking_fee')
    .reduce((sum, entry) => sum + entry.amountCents, 0)

  const creditsCents = entries
    .filter((entry) => entry.source === 'credit_adjustment')
    .reduce((sum, entry) => sum + entry.amountCents, 0)

  const totalBilledCents = entries.reduce((sum, entry) => sum + entry.amountCents, 0)

  return {
    mrrCents,
    bookingFeesCents,
    creditsCents,
    totalBilledCents,
    entries
  }
}

export interface BillingAlert {
  id: string
  invoiceId: string | null
  alertType: string
  message: string
  createdAt: string
}

export async function getOpenBillingAlerts(tenantId: string): Promise<BillingAlert[]> {
  const { data, error } = await supabaseAdmin
    .from('billing_alerts')
    .select('id, invoice_id, alert_type, message, created_at')
    .eq('tenant_id', tenantId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Failed to load billing alerts', { error: error.message, tenantId })
    throw new Error('Failed to load billing alerts')
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    invoiceId: row.invoice_id,
    alertType: row.alert_type,
    message: row.message,
    createdAt: row.created_at
  }))
}

export async function resolveBillingAlert(alertId: string, tenantId: string) {
  const { error } = await supabaseAdmin
    .from('billing_alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('tenant_id', tenantId)

  if (error) {
    logger.error('Failed to resolve billing alert', { error: error.message, alertId, tenantId })
    throw new Error('Failed to resolve alert')
  }
}

export async function createBillingAlert(params: {
  tenantId: string
  invoiceId: string | null
  type: string
  message: string
  metadata?: Record<string, unknown>
}) {
  const payload = {
    tenant_id: params.tenantId,
    invoice_id: params.invoiceId,
    alert_type: params.type,
    message: params.message,
    metadata: params.metadata ?? {}
  }

  const { error } = await supabaseAdmin.from('billing_alerts').upsert(payload, {
    onConflict: 'tenant_id,invoice_id,alert_type'
  })

  if (error) {
    logger.error('Failed to create billing alert', { error: error.message, tenantId: params.tenantId })
    throw new Error('Failed to create billing alert')
  }
}

export async function enqueueDunningSteps(params: { tenantId: string; invoiceId: string }) {
  const steps = [
    { step: 1, channel: 'email' },
    { step: 2, channel: 'sms' },
    { step: 3, channel: 'email' }
  ]

  for (const step of steps) {
    const { error } = await supabaseAdmin.from('billing_dunning_events').upsert(
      {
        tenant_id: params.tenantId,
        invoice_id: params.invoiceId,
        step: step.step,
        channel: step.channel,
        status: 'pending'
      },
      {
        onConflict: 'tenant_id,invoice_id,step,channel'
      }
    )

    if (error) {
      logger.error('Failed to enqueue dunning step', {
        error: error.message,
        invoiceId: params.invoiceId,
        tenantId: params.tenantId,
        step: step.step
      })
      throw new Error('Failed to enqueue dunning step')
    }
  }
}


