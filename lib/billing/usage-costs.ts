import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

/**
 * Records a single cost-to-serve event into usage_costs. This is the one
 * write path for the per-client cost tracker; every provider funnels
 * through here.
 *
 * Safe to call from a hot path: it never throws. A cost-logging failure
 * must not break a call, an SMS reply, or a payment - we log and move on.
 * Idempotent: (provider, kind, ref_id) is unique, so duplicate webhook
 * fires and backfill re-runs are ignored rather than double-counted.
 */
export type UsageCostInput = {
  businessId: string | null
  provider: 'retell' | 'anthropic' | 'telnyx' | 'google' | 'stripe'
  kind: 'voice' | 'llm' | 'sms' | 'routes' | 'fee'
  amountCents: number
  quantity?: number
  unit?: 'minute' | 'token' | 'segment' | 'call'
  refType?: 'call' | 'sms' | 'invoice' | 'message'
  refId?: string | null
  occurredAt?: string
  metadata?: Record<string, unknown>
}

export async function recordUsageCost(input: UsageCostInput): Promise<void> {
  if (!input.businessId) return // unattributable cost - skip rather than orphan
  try {
    const { error } = await supabaseAdmin.from('usage_costs').upsert(
      {
        business_id: input.businessId,
        provider: input.provider,
        kind: input.kind,
        amount_cents: Math.round(input.amountCents),
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        ref_type: input.refType ?? null,
        ref_id: input.refId ?? null,
        occurred_at: input.occurredAt ?? new Date().toISOString(),
        metadata: input.metadata ?? {},
      },
      { onConflict: 'provider,kind,ref_id', ignoreDuplicates: true },
    )
    if (error) {
      logger.warn('recordUsageCost failed', {
        provider: input.provider,
        kind: input.kind,
        error: error.message,
      })
    }
  } catch (e) {
    logger.warn('recordUsageCost threw', {
      provider: input.provider,
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }
}
