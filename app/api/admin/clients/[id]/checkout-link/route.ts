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

type Plan = 'starter' | 'full'

const PLAN_META: Record<Plan, { priceEnv: string; label: string; amount: string }> = {
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

  const body = await request.json().catch(() => ({}))
  const plan = (body.plan === 'full' ? 'full' : 'starter') as Plan
  const priceId = process.env[PLAN_META[plan].priceEnv]
  if (!priceId) {
   return NextResponse.json({
    error: `Missing env var ${PLAN_META[plan].priceEnv}. Set the Stripe Price ID for the ${PLAN_META[plan].label} plan in Vercel and redeploy.`,
   }, { status: 500 })
  }

  const { data: business } = await supabaseAdmin
   .from('businesses')
   .select('id, business_name, email, phone_number, stripe_customer_id, owner_id')
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

  const session = await stripe.checkout.sessions.create({
   mode: 'subscription',
   customer: stripeCustomerId,
   line_items: [{ price: priceId, quantity: 1 }],
   success_url: successUrl,
   cancel_url: cancelUrl,
   allow_promotion_codes: true,
   subscription_data: {
    metadata: {
     cloudgreet_business_id: business.id,
     plan,
    },
   },
   metadata: {
    cloudgreet_business_id: business.id,
    plan,
   },
  })

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
   plan_label: PLAN_META[plan].label,
   amount: PLAN_META[plan].amount,
   business_name: business.business_name,
  })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  logger.error('Admin checkout-link failed', { error: msg, clientId: params.id })
  return NextResponse.json({ error: msg }, { status: 500 })
 }
}
