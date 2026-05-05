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
 * body: { plan: 'starter' | 'full' }
 *
 * Bridges "client said yes" → "client paid":
 *  1. Ensures the business has a Stripe Customer (creates + persists one
 *     against businesses.stripe_customer_id when missing).
 *  2. Creates a Stripe Checkout Session in subscription mode with the
 *     plan's price ID.
 *  3. Returns the checkout URL for the admin to copy + send to the
 *     client (Signal, SMS, email).
 *
 * The existing /api/stripe/webhook handler picks up checkout.session.completed
 * and flips subscription_status to active, so no extra wiring needed
 * after the client pays.
 */

type Plan = 'starter' | 'full' | 'custom'

const PLAN_META: Record<Exclude<Plan, 'custom'>, { priceEnv: string; label: string; amount: string }> = {
 starter: { priceEnv: 'STRIPE_PRICE_STARTER', label: 'Starter (after-hours)', amount: '$499/mo' },
 full:    { priceEnv: 'STRIPE_PRICE_FULL',    label: 'Full 24/7',             amount: '$899/mo' },
}

export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Body now accepts either:
  //   { plan: 'starter' | 'full' }                  - legacy preset
  //   { plan: 'custom', monthly_cents, setup_fee_cents } - variable pricing
  // The custom path lets a sales rep negotiate any monthly amount
  // (e.g., $2,000 for a law firm) plus an optional one-time setup
  // fee. We use Stripe's inline price_data so we don't have to
  // pre-create a Price for every variant.
  const body = await request.json().catch(() => ({})) as {
   plan?: 'starter' | 'full' | 'custom'
   monthly_cents?: number
   setup_fee_cents?: number
  }
  const plan: Plan = body.plan === 'full' ? 'full' : body.plan === 'custom' ? 'custom' : 'starter'

  let priceId: string | null = null
  let monthlyCents = 0
  let label = ''
  let amountStr = ''

  if (plan === 'custom') {
   const m = Math.round(Number(body.monthly_cents))
   if (!Number.isFinite(m) || m < 5000) {
    return NextResponse.json({
     error: 'Custom monthly amount must be at least $50 (5000 cents).',
    }, { status: 400 })
   }
   if (m > 5000000) {
    return NextResponse.json({
     error: 'Custom monthly amount looks too high (>$50,000). Double-check the value.',
    }, { status: 400 })
   }
   monthlyCents = m
   label = `Custom - $${(m / 100).toFixed(0)}/mo`
   amountStr = `$${(m / 100).toFixed(0)}/mo`
  } else {
   priceId = process.env[PLAN_META[plan].priceEnv] ?? null
   if (!priceId) {
    return NextResponse.json({
     error: `Missing env var ${PLAN_META[plan].priceEnv}. Set the Stripe Price ID for the ${PLAN_META[plan].label} plan in Vercel and redeploy.`,
    }, { status: 500 })
   }
   label = PLAN_META[plan].label
   amountStr = PLAN_META[plan].amount
  }

  // Setup fee is optional on every plan path. Validates same range
  // as monthly to catch typos.
  const setupFeeCents = Math.round(Number(body.setup_fee_cents || 0))
  if (!Number.isFinite(setupFeeCents) || setupFeeCents < 0) {
   return NextResponse.json({ error: 'Setup fee must be a non-negative number.' }, { status: 400 })
  }
  if (setupFeeCents > 1000000) {
   return NextResponse.json({ error: 'Setup fee looks too high (>$10,000). Double-check.' }, { status: 400 })
  }

  const { data: business } = await supabaseAdmin
   .from('businesses')
   .select('id, business_name, email, phone_number, stripe_customer_id, owner_id, rep_id')
   .eq('id', params.id)
   .maybeSingle()

  if (!business) {
   return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const stripe = getStripeClient()

  // Ensure a Stripe Customer exists for this business.
  let stripeCustomerId = business.stripe_customer_id
  if (!stripeCustomerId) {
   // Owner email is a better contact than the business email field.
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

  // Build line_items based on plan type. Custom plans use inline
  // price_data so we don't have to pre-create a Stripe Price for
  // every negotiated rate. Setup fee (if any) gets added as a
  // separate one-time line item.
  const lineItems: any[] = []
  if (plan === 'custom') {
   lineItems.push({
    price_data: {
     currency: 'usd',
     product_data: { name: 'CloudGreet AI Receptionist (custom)' },
     unit_amount: monthlyCents,
     recurring: { interval: 'month' },
    },
    quantity: 1,
   })
  } else {
   lineItems.push({ price: priceId!, quantity: 1 })
  }

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

  const session = await stripe.checkout.sessions.create({
   mode: 'subscription',
   customer: stripeCustomerId,
   line_items: lineItems,
   success_url: successUrl,
   cancel_url: cancelUrl,
   allow_promotion_codes: true,
   subscription_data: {
    metadata: {
     cloudgreet_business_id: business.id,
     plan,
     // Persist negotiated amounts on the subscription so the
     // commission engine can split correctly when invoices pay.
     monthly_cents: String(plan === 'custom' ? monthlyCents : (plan === 'full' ? 89900 : 49900)),
     setup_fee_cents: String(setupFeeCents),
     rep_id: business.rep_id || '',
    },
   },
   metadata: {
    cloudgreet_business_id: business.id,
    plan,
    rep_id: business.rep_id || '',
   },
  })

  // Persist the negotiated price on the business immediately so the
  // admin UI shows what was offered (regardless of whether the client
  // ever completes checkout). Updated again on invoice.paid by the
  // webhook to record actual paid amounts.
  await supabaseAdmin
   .from('businesses')
   .update({
    monthly_price_cents: plan === 'custom' ? monthlyCents : (plan === 'full' ? 89900 : 49900),
    setup_fee_cents: setupFeeCents || null,
    updated_at: new Date().toISOString(),
   })
   .eq('id', business.id)

  if (!session.url) {
   return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
  }

  logger.info('Admin generated Stripe checkout link', {
   businessId: business.id, plan, sessionId: session.id,
  })

  return NextResponse.json({
   success: true,
   url: session.url,
   plan,
   plan_label: label,
   amount: amountStr,
   setup_fee_cents: setupFeeCents,
   business_name: business.business_name,
  })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  logger.error('Admin checkout-link failed', { error: msg, clientId: params.id })
  return NextResponse.json({ error: msg }, { status: 500 })
 }
}
