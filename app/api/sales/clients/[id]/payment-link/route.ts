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

  const email = String(body?.email || (biz as any).email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'No email on this account. Add one first.' }, { status: 400 })
  }

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
  if (setupCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'CloudGreet setup fee (one-time)' },
        unit_amount: setupCents,
      },
      quantity: 1,
    })
  }

  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: lineItems,
      success_url: `${baseUrl}/payment/success?business=${biz.id}`,
      cancel_url: `${baseUrl}/payment/cancel?business=${biz.id}`,
      allow_promotion_codes: true,
      metadata: {
        cloudgreet_business_id: biz.id,
        cloudgreet_rep_id: auth.userId,
        cloudgreet_source: 'rep_prospect_link',
      },
      subscription_data: {
        metadata: {
          cloudgreet_business_id: biz.id,
          cloudgreet_rep_id: auth.userId,
          monthly_cents: String(monthlyCents),
          setup_fee_cents: String(setupCents),
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
