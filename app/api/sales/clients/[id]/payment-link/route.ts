import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { getStripeClient } from '@/lib/billing/stripe-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/clients/[id]/payment-link  { monthly_cents, setup_fee_cents?, email? }
 *
 * Payment link for a prospect that already exists as a business (linked but
 * not paying). Unlike the lead/close payment-link, no close is created - the
 * business is real already. The Stripe checkout is tagged with
 * metadata.cloudgreet_business_id so the existing checkout.session.completed
 * handler flips the business to active, and invoice.paid commissions the rep
 * (off businesses.rep_id). Same guard rails: $50 min, $50k ceiling, email
 * required.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, email, rep_id, monthly_price_cents, setup_fee_cents')
    .eq('id', params.id)
    .maybeSingle()
  if (!biz) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if ((biz as any).rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your account' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({} as any))
  const monthlyCents = Math.round(Number(body?.monthly_cents ?? (biz as any).monthly_price_cents))
  const setupCents = Math.round(Number(body?.setup_fee_cents ?? (biz as any).setup_fee_cents ?? 0))

  if (!Number.isFinite(monthlyCents) || monthlyCents < 5000) {
    return NextResponse.json({ error: 'Monthly amount must be at least $50.' }, { status: 400 })
  }
  if (monthlyCents > 5_000_000) {
    return NextResponse.json({ error: 'Monthly amount looks too high (>$50,000).' }, { status: 400 })
  }
  if (!Number.isFinite(setupCents) || setupCents < 0 || setupCents > 5_000_000) {
    return NextResponse.json({ error: 'Setup fee out of range.' }, { status: 400 })
  }

  // We deliberately do NOT lock the payer's email. Whoever actually pays
  // (an owner, a manager, a corporate AP office - common for restaurant
  // groups) enters their own email at Stripe checkout for the receipt.
  // The account is linked to this business by metadata.cloudgreet_business_id,
  // NOT by email, so a different payer email is fine.

  // Optional 1-week free trial: card is collected up front, nothing is
  // charged now. Stripe defers the first invoice - the monthly AND the
  // one-time setup fee - to trial end, so the setup fee still applies,
  // it just bills once when the 7 days are up (along with the first
  // month). Rep commission credits on that first paid invoice.
  const freeTrial = body?.free_trial === true

  // Persist the negotiated price on the business so the rep MRR + cost-margin
  // reflect it once they pay.
  await supabaseAdmin
    .from('businesses')
    .update({ monthly_price_cents: monthlyCents, setup_fee_cents: setupCents, updated_at: new Date().toISOString() })
    .eq('id', biz.id)

  const stripe = getStripeClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'

  const lineItems: any[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: 'CloudGreet AI Receptionist' },
        unit_amount: monthlyCents,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    },
  ]
  // On a free trial the setup fee is NOT a checkout line item (those bill
  // immediately, defeating the trial). Instead the webhook attaches it as a
  // pending invoice item on the subscription so Stripe bills it once, on the
  // first invoice at trial end, together with the first month. Without a
  // trial it stays a normal one-time line item, charged at checkout.
  if (setupCents > 0 && !freeTrial) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'CloudGreet setup fee (one-time)' },
        unit_amount: setupCents,
      },
      quantity: 1,
    })
  }

  // On a trial the setup fee is charged at trial end (attached by the
  // webhook), so it isn't a Checkout line item and Stripe can't show it in
  // the summary. Disclose it on the page so the trial-end charge is never a
  // surprise.
  const setupDollars = (setupCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const trialSetupNotice = freeTrial && setupCents > 0
    ? { submit: { message: `Your card won't be charged today. When your 7-day free trial ends, a one-time $${setupDollars} setup fee plus your first month will be charged together, then monthly after that.` } }
    : undefined

  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // no customer_email → Stripe prompts the payer for their own email
      line_items: lineItems,
      ...(trialSetupNotice ? { custom_text: trialSetupNotice } : {}),
      success_url: `${baseUrl}/payment/success?business=${biz.id}`,
      cancel_url: `${baseUrl}/payment/cancel?business=${biz.id}`,
      allow_promotion_codes: true,
      metadata: {
        cloudgreet_business_id: biz.id,
        cloudgreet_rep_id: auth.userId,
        cloudgreet_source: 'rep_prospect_link',
      },
      subscription_data: {
        ...(freeTrial ? { trial_period_days: 7 } : {}),
        metadata: {
          cloudgreet_business_id: biz.id,
          cloudgreet_rep_id: auth.userId,
          monthly_cents: String(monthlyCents),
          setup_fee_cents: String(setupCents),
          free_trial: String(freeTrial),
        },
      },
    })
  } catch (e) {
    logger.error('Prospect payment-link Stripe call failed', {
      repId: auth.userId, businessId: biz.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Stripe error' }, { status: 502 })
  }

  if (!session?.url) {
    return NextResponse.json({ error: 'Stripe did not return a URL' }, { status: 500 })
  }

  logger.info('Rep generated prospect payment link', {
    repId: auth.userId, businessId: biz.id, sessionId: session.id,
  })

  return NextResponse.json({ success: true, url: session.url, expires_at: session.expires_at })
}
