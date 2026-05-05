import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { getStripeClient } from '@/lib/billing/stripe-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/clients/[id]/stripe-sync
 *
 * Pulls the live subscription state from Stripe for this business
 * and writes it back to:
 *   · businesses.subscription_status
 *   · stripe_subscriptions  (upsert)
 *   · closes.status         (paid when sub is active/trialing)
 *
 * Use this whenever DB state drifts from Stripe — most commonly
 * when a webhook fired before the customer was linked, leaving
 * subscription_status stuck at 'pending'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, stripe_customer_id, rep_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (!business.stripe_customer_id) {
    return NextResponse.json({
      error: 'No stripe_customer_id on this business yet — nothing to sync.',
    }, { status: 409 })
  }

  const stripe = getStripeClient()

  // Pull subscriptions for the customer. Includes ones in any state
  // (active, trialing, past_due, canceled). Most clients only have
  // one; if multiple, we use the most recent.
  let subs
  try {
    subs = await stripe.subscriptions.list({
      customer: business.stripe_customer_id,
      status: 'all',
      limit: 5,
    })
  } catch (e) {
    logger.error('Stripe subscriptions.list failed', {
      clientId: business.id, error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Stripe error',
    }, { status: 502 })
  }

  if (!subs.data.length) {
    // No subs found. Mark them as no_subscription and bail.
    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: 'none',
        updated_at: new Date().toISOString(),
      })
      .eq('id', business.id)
    return NextResponse.json({
      success: true,
      synced: 'no_subscription',
      message: 'No subscriptions found on this customer in Stripe.',
    })
  }

  // Pick the most recently updated sub (most relevant state).
  const sub = subs.data
    .slice()
    .sort((a, b) => (b.created || 0) - (a.created || 0))[0]

  // Update business
  await supabaseAdmin
    .from('businesses')
    .update({
      subscription_status: sub.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', business.id)

  // Upsert stripe_subscriptions row (best-effort, schema may vary)
  try {
    await supabaseAdmin
      .from('stripe_subscriptions')
      .upsert({
        business_id: business.id,
        stripe_subscription_id: sub.id,
        stripe_customer_id: business.stripe_customer_id,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' })
  } catch (e) {
    logger.warn('stripe_subscriptions upsert failed (non-fatal)', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  // If this is a rep-sourced business and the sub is now in a paid
  // state, advance any stuck closes from invoice_sent/pending → paid.
  if (business.rep_id && (sub.status === 'active' || sub.status === 'trialing')) {
    try {
      await supabaseAdmin
        .from('closes')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('business_id', business.id)
        .in('status', ['invoice_sent', 'pending'])
    } catch (e) {
      logger.warn('close.status sync after stripe-sync failed', {
        error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  }

  logger.info('Admin stripe-sync ran', {
    clientId: business.id, subStatus: sub.status,
  })

  return NextResponse.json({
    success: true,
    synced: sub.status,
    subscription: {
      id: sub.id,
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end || false,
    },
  })
}
