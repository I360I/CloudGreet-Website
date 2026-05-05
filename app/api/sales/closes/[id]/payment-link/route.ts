import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { getStripeClient } from '@/lib/billing/stripe-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/closes/[id]/payment-link
 *
 * Rep self-serve payment-link generator. Creates a Stripe Checkout
 * session at the close's negotiated pricing, gated by the rep's
 * sales_reps.max_monthly_cents / max_setup_cents caps. Stamps
 * `metadata.cloudgreet_close_id` so the webhook's
 * `checkout.session.completed` handler can auto-convert the close
 * into a real client when payment lands — no admin step required.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Pull the close + verify rep owns it.
  const { data: close } = await supabaseAdmin
    .from('closes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!close) return NextResponse.json({ error: 'Close not found' }, { status: 404 })
  if (close.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your close' }, { status: 403 })
  }
  if (close.business_id) {
    return NextResponse.json({
      error: 'This close is already linked to a client. The payment link was already used or admin already converted it.',
    }, { status: 409 })
  }
  if (close.status === 'rejected' || close.status === 'cancelled') {
    return NextResponse.json({ error: `Close is ${close.status}; can't generate a link.` }, { status: 409 })
  }

  // No upper cap — reps can generate payment links at any amount they
  // negotiated. Stripe still requires a $50 minimum for monthly. The
  // sales_reps.max_monthly_cents / max_setup_cents columns are kept
  // in the schema for future use but are not enforced here.
  const monthlyCents = close.agreed_monthly_cents || 0
  const setupCents = close.agreed_setup_fee_cents || 0
  if (monthlyCents < 5000) {
    return NextResponse.json({ error: 'Monthly amount must be at least $50.' }, { status: 400 })
  }
  if (monthlyCents > 5_000_000) {
    return NextResponse.json({ error: 'Monthly amount looks too high (>$50,000). Double-check the value.' }, { status: 400 })
  }
  if (setupCents < 0 || setupCents > 5_000_000) {
    return NextResponse.json({ error: 'Setup fee out of range.' }, { status: 400 })
  }

  // We require an email so Stripe can identify the customer + send
  // the receipt. If the close didn't capture one, the rep should
  // edit the close first (or admin can add it manually).
  const email = (close.prospect_email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({
      error: "This close has no prospect email. Add one on the close before generating a payment link.",
    }, { status: 400 })
  }

  const stripe = getStripeClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const successUrl = `${baseUrl}/payment/success?close=${close.id}`
  const cancelUrl = `${baseUrl}/payment/cancel?close=${close.id}`

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
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      // Top-level metadata is what the checkout.session.completed
      // webhook reads. We tag close_id so the handler can run the
      // convert flow before the standard subscription bookkeeping.
      metadata: {
        cloudgreet_close_id: close.id,
        cloudgreet_rep_id: close.rep_id,
        cloudgreet_source: 'rep_self_serve',
      },
      subscription_data: {
        metadata: {
          cloudgreet_close_id: close.id,
          cloudgreet_rep_id: close.rep_id,
          monthly_cents: String(monthlyCents),
          setup_fee_cents: String(setupCents),
        },
      },
    })
  } catch (e) {
    logger.error('Rep payment-link Stripe call failed', {
      repId: auth.userId, closeId: close.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Stripe error',
    }, { status: 502 })
  }

  if (!session?.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
  }

  // Best-effort heads-up to Anthony so you can see what reps are sending.
  try {
    const resendKey = process.env.RESEND_API_KEY
    const founderEmail = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
    if (resendKey) {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const { data: rep } = await supabaseAdmin
        .from('custom_users')
        .select('name, email')
        .eq('id', auth.userId)
        .maybeSingle()
      const repName = rep?.name || rep?.email || 'A rep'
      const monthlyDisp = `$${(monthlyCents / 100).toFixed(0)}/mo`
      const setupDisp = setupCents > 0 ? ` + $${(setupCents / 100).toFixed(0)} setup` : ''
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: founderEmail,
        replyTo: rep?.email || undefined,
        subject: `${repName} sent a payment link to ${close.prospect_business_name}`,
        text:
`${repName} just generated a Stripe payment link.

  Prospect:  ${close.prospect_business_name}
  Email:     ${email}
  Pricing:   ${monthlyDisp}${setupDisp}

When the prospect pays, the close auto-converts to a client with
rep_id=${close.rep_id} stamped — no action needed from you.

Stripe session: ${session.id}
`,
      })
    }
  } catch (e) {
    logger.warn('Rep payment-link founder email failed', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  logger.info('Rep generated self-serve payment link', {
    repId: auth.userId, closeId: close.id, sessionId: session.id,
  })

  return NextResponse.json({
    success: true,
    url: session.url,
    expires_at: session.expires_at, // unix seconds
  })
}
