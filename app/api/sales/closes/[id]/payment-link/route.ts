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
 * into a real client when payment lands - no admin step required.
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
  if (close.status === 'paid') {
    return NextResponse.json({
      error: "This close is already paid - nothing to generate.",
    }, { status: 409 })
  }
  if (close.status === 'rejected' || close.status === 'cancelled') {
    return NextResponse.json({ error: `Close is ${close.status}; can't generate a link.` }, { status: 409 })
  }

  // If a business already exists from a prior "Send booking link", reuse
  // its Stripe customer (creating one if missing) so the payment lands
  // on the same account instead of orphaning a brand-new Stripe customer.
  let existingCustomerId: string | null = null
  if (close.business_id) {
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, email, phone_number, owner_id, stripe_customer_id')
      .eq('id', close.business_id)
      .maybeSingle()
    if (biz?.stripe_customer_id) {
      existingCustomerId = biz.stripe_customer_id
    } else if (biz) {
      // Create a Stripe customer for the existing business now and persist.
      try {
        const stripe = getStripeClient()
        let ownerEmail = biz.email || close.prospect_email
        if (!ownerEmail && biz.owner_id) {
          const { data: owner } = await supabaseAdmin
            .from('custom_users')
            .select('email')
            .eq('id', biz.owner_id)
            .maybeSingle()
          if (owner?.email) ownerEmail = owner.email
        }
        const customer = await stripe.customers.create({
          name: biz.business_name || close.prospect_business_name || undefined,
          email: ownerEmail || undefined,
          phone: biz.phone_number || close.prospect_phone || undefined,
          metadata: { cloudgreet_business_id: biz.id },
        })
        existingCustomerId = customer.id
        await supabaseAdmin
          .from('businesses')
          .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
          .eq('id', biz.id)
      } catch (e) {
        logger.warn('Could not create Stripe customer for existing business', {
          closeId: close.id, error: e instanceof Error ? e.message : 'Unknown',
        })
      }
    }
  }

  // Body overrides: when the rep opens the payment-link form on a close
  // whose agreed amounts are 0/null (e.g. close was created from a "send
  // booking link" before pricing was confirmed), they pass the actual
  // numbers in the body. We persist them back to the close so the close
  // row reflects what the customer is actually being charged.
  const body = await request.json().catch(() => ({} as any))
  const overrideMonthly = body?.monthly_cents != null ? Math.round(Number(body.monthly_cents)) : null
  const overrideSetup = body?.setup_fee_cents != null ? Math.round(Number(body.setup_fee_cents)) : null
  const overrideEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null

  // No upper cap - reps can generate payment links at any amount they
  // negotiated. Stripe still requires a $50 minimum for monthly.
  const monthlyCents = overrideMonthly && overrideMonthly > 0
    ? overrideMonthly
    : (close.agreed_monthly_cents || 0)
  const setupCents = overrideSetup != null
    ? overrideSetup
    : (close.agreed_setup_fee_cents || 0)
  if (!Number.isFinite(monthlyCents) || monthlyCents < 5000) {
    return NextResponse.json({ error: 'Monthly amount must be at least $50.' }, { status: 400 })
  }
  if (monthlyCents > 5_000_000) {
    return NextResponse.json({ error: 'Monthly amount looks too high (>$50,000). Double-check the value.' }, { status: 400 })
  }
  if (!Number.isFinite(setupCents) || setupCents < 0 || setupCents > 5_000_000) {
    return NextResponse.json({ error: 'Setup fee out of range.' }, { status: 400 })
  }

  // Persist the overrides to the close row so what we charge matches
  // what the close says it agreed to.
  if (
    (overrideMonthly != null && overrideMonthly !== close.agreed_monthly_cents) ||
    (overrideSetup != null && overrideSetup !== close.agreed_setup_fee_cents)
  ) {
    await supabaseAdmin
      .from('closes')
      .update({
        agreed_monthly_cents: monthlyCents,
        agreed_setup_fee_cents: setupCents,
        updated_at: new Date().toISOString(),
      })
      .eq('id', close.id)
  }

  // Idempotency: if there's already a recent session for this close
  // with the same pricing, hand back the existing URL. Stops a
  // double-click from creating two Stripe sessions for one prospect.
  // Rep can pass { force: true } to bypass and mint a fresh one.
  const force = body?.force === true
  const cachedExpiresAt = (close as any).latest_payment_session_expires_at as string | null
  const cachedUrl = (close as any).latest_payment_session_url as string | null
  const cachedSessionId = (close as any).latest_payment_session_id as string | null
  const cachedMonthly = (close as any).latest_payment_session_monthly_cents as number | null
  const cachedSetup = (close as any).latest_payment_session_setup_cents as number | null
  const cacheValid =
    !force &&
    !!cachedUrl &&
    !!cachedExpiresAt &&
    new Date(cachedExpiresAt).getTime() > Date.now() &&
    cachedMonthly === monthlyCents &&
    (cachedSetup ?? 0) === setupCents
  if (cacheValid) {
    logger.info('Rep payment-link reused cached session', {
      repId: auth.userId, closeId: close.id, sessionId: cachedSessionId,
    })
    return NextResponse.json({
      success: true,
      url: cachedUrl,
      reused: true,
      expires_at: Math.floor(new Date(cachedExpiresAt!).getTime() / 1000),
    })
  }

  // We require an email so Stripe can identify the customer + send
  // the receipt. If the close didn't capture one, the rep can pass
  // it via the body.
  const email = (overrideEmail || close.prospect_email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({
      error: "This close has no prospect email. Add one on the close (or paste one into the form) before generating a payment link.",
    }, { status: 400 })
  }
  // If the close had no email but the rep just provided one, persist it.
  if (overrideEmail && !close.prospect_email) {
    await supabaseAdmin
      .from('closes')
      .update({ prospect_email: overrideEmail, updated_at: new Date().toISOString() })
      .eq('id', close.id)
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
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: email }),
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

  // Cache the session on the close so a refresh / double-click hits
  // the cache branch above instead of creating another Stripe session.
  await supabaseAdmin
    .from('closes')
    .update({
      latest_payment_session_id: session.id,
      latest_payment_session_url: session.url,
      latest_payment_session_expires_at: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
      latest_payment_session_monthly_cents: monthlyCents,
      latest_payment_session_setup_cents: setupCents,
      updated_at: new Date().toISOString(),
    })
    .eq('id', close.id)

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
rep_id=${close.rep_id} stamped - no action needed from you.

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
