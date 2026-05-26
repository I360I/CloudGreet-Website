import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { getStripeClient } from '@/lib/billing/stripe-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/clients/[id]/checkout-link
 *
 * body: { monthly_cents: number, setup_fee_cents?: number }
 *
 * Pricing is rep-negotiated per close. We never ship a fixed-tier
 * Price, so every checkout uses Stripe inline `price_data` for the
 * recurring monthly amount plus an optional one-time setup-fee line.
 *
 * The existing /api/stripe/webhook handler picks up
 * checkout.session.completed and flips subscription_status to active.
 */

export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
   monthly_cents?: number
   setup_fee_cents?: number
   platform_only?: boolean
  }
  // Default to platform-only when admin generates the link: revenue
  // goes 100% to the platform regardless of business.rep_id. Pass
  // platform_only:false explicitly to keep the rep commission split.
  const platformOnly = body.platform_only !== false

  const monthlyCents = Math.round(Number(body.monthly_cents))
  if (!Number.isFinite(monthlyCents) || monthlyCents < 5000) {
   return NextResponse.json({
    error: 'Monthly amount must be at least $50 (5000 cents).',
   }, { status: 400 })
  }
  if (monthlyCents > 5000000) {
   return NextResponse.json({
    error: 'Monthly amount looks too high (>$50,000). Double-check the value.',
   }, { status: 400 })
  }

  const setupFeeCents = Math.round(Number(body.setup_fee_cents || 0))
  if (!Number.isFinite(setupFeeCents) || setupFeeCents < 0) {
   return NextResponse.json({ error: 'Setup fee must be a non-negative number.' }, { status: 400 })
  }
  if (setupFeeCents > 1000000) {
   return NextResponse.json({ error: 'Setup fee looks too high (>$10,000). Double-check.' }, { status: 400 })
  }

  const label = `CloudGreet - $${(monthlyCents / 100).toFixed(0)}/mo`
  const amountStr = `$${(monthlyCents / 100).toFixed(0)}/mo`

  const { data: business } = await supabaseAdmin
   .from('businesses')
   .select('id, business_name, email, phone_number, stripe_customer_id, owner_id, rep_id')
   .eq('id', params.id)
   .maybeSingle()

  if (!business) {
   return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const stripe = getStripeClient()

  let stripeCustomerId = business.stripe_customer_id
  if (!stripeCustomerId) {
   let ownerEmail = business.email || null
   if (business.owner_id) {
    const { data: owner } = await supabaseAdmin
     .from('custom_users')
     .select('email')
     .eq('id', business.owner_id)
     .maybeSingle()
    if (owner?.email) ownerEmail = owner.email
   }

   const customer = await stripe.customers.create({
    name: business.business_name || undefined,
    email: ownerEmail || undefined,
    phone: business.phone_number || undefined,
    metadata: {
     cloudgreet_business_id: business.id,
    },
   })
   stripeCustomerId = customer.id

   const { error: persistErr } = await supabaseAdmin
    .from('businesses')
    .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
    .eq('id', business.id)
   if (persistErr) {
    logger.warn('Failed to persist stripe_customer_id', {
     error: persistErr.message, businessId: business.id, stripeCustomerId,
    })
   }
  }

  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/dashboard/billing?stripe=success`
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/dashboard/billing?stripe=cancel`

  const lineItems: any[] = [{
   price_data: {
    currency: 'usd',
    product_data: { name: 'CloudGreet AI Receptionist' },
    unit_amount: monthlyCents,
    recurring: { interval: 'month' },
   },
   quantity: 1,
  }]

  if (setupFeeCents > 0) {
   lineItems.push({
    price_data: {
     currency: 'usd',
     product_data: { name: 'CloudGreet setup fee (one-time)' },
     unit_amount: setupFeeCents,
    },
    quantity: 1,
   })
  }

  const subscriptionMeta: Record<string, string> = {
   cloudgreet_business_id: business.id,
   plan: 'custom',
   monthly_cents: String(monthlyCents),
   setup_fee_cents: String(setupFeeCents),
   // When platform_only is set, blank out rep_id on the metadata AND
   // stamp cg_no_commission so the Stripe webhook short-circuits the
   // 50/50 split (defense in depth against the business row having
   // a rep_id we forgot to clear).
   rep_id: platformOnly ? '' : (business.rep_id || ''),
  }
  if (platformOnly) subscriptionMeta.cg_no_commission = 'true'

  const sessionMeta: Record<string, string> = {
   cloudgreet_business_id: business.id,
   plan: 'custom',
   rep_id: platformOnly ? '' : (business.rep_id || ''),
  }
  if (platformOnly) sessionMeta.cg_no_commission = 'true'

  const session = await stripe.checkout.sessions.create({
   mode: 'subscription',
   customer: stripeCustomerId,
   line_items: lineItems,
   success_url: successUrl,
   cancel_url: cancelUrl,
   allow_promotion_codes: true,
   subscription_data: { metadata: subscriptionMeta },
   metadata: sessionMeta,
  })

  await supabaseAdmin
   .from('businesses')
   .update({
    monthly_price_cents: monthlyCents,
    setup_fee_cents: setupFeeCents || null,
    updated_at: new Date().toISOString(),
   })
   .eq('id', business.id)

  if (!session.url) {
   return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
  }

  logger.info('Admin generated Stripe checkout link', {
   businessId: business.id, monthlyCents, setupFeeCents, sessionId: session.id, platformOnly,
  })

  return NextResponse.json({
   success: true,
   url: session.url,
   plan: 'custom',
   plan_label: label,
   amount: amountStr,
   setup_fee_cents: setupFeeCents,
   business_name: business.business_name,
   platform_only: platformOnly,
  })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  logger.error('Admin checkout-link failed', { error: msg, clientId: params.id })
  return NextResponse.json({ error: msg }, { status: 500 })
 }
}
