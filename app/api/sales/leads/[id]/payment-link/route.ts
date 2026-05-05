import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { getStripeClient } from '@/lib/billing/stripe-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/payment-link
 *   { monthly_cents, setup_fee_cents? }
 *
 * One-click payment link for a lead - no manual close submission
 * required. Creates a `closes` row in the background (status =
 * invoice_sent), generates a Stripe checkout session tagged with
 * metadata.cloudgreet_close_id, advances the lead's status to
 * proposal_sent, and returns the URL for the rep to send.
 *
 * When the prospect pays, the existing checkout.session.completed
 * handler auto-converts the close into a real client (creating
 * the user + business with rep_id stamped), then invoice.paid
 * writes the 50% commission to the ledger.
 *
 * Identical guard rails to the close-based payment-link route:
 *   · Stripe minimum $50 monthly
 *   · sanity ceiling $50,000
 *   · prospect_email required (Stripe needs it to identify customer)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Verify rep owns this lead.
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) return NextResponse.json({ error: 'Not your lead' }, { status: 404 })

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, contact_name, phone, email')
    .eq('id', params.id)
    .maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const body = await request.json().catch(() => ({} as any))
  const monthlyCents = Math.round(Number(body?.monthly_cents))
  const setupCents = Math.round(Number(body?.setup_fee_cents ?? 0))

  if (!Number.isFinite(monthlyCents) || monthlyCents < 5000) {
    return NextResponse.json({ error: 'Monthly amount must be at least $50.' }, { status: 400 })
  }
  if (monthlyCents > 5_000_000) {
    return NextResponse.json({ error: 'Monthly amount looks too high (>$50,000).' }, { status: 400 })
  }
  if (!Number.isFinite(setupCents) || setupCents < 0 || setupCents > 5_000_000) {
    return NextResponse.json({ error: 'Setup fee out of range.' }, { status: 400 })
  }

  // We need an email for Stripe. The lead's email is the natural
  // choice; if it's missing the rep can override via body.email.
  const email = String(body?.email || lead.email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({
      error: 'No email on this lead. Add one to the lead first.',
    }, { status: 400 })
  }

  // Create the close in the background. status=invoice_sent because
  // we're effectively shipping the payment link - once it lands,
  // the webhook flips it to paid.
  const businessName = lead.business_name || 'Unknown'
  const { data: close, error: closeErr } = await supabaseAdmin
    .from('closes')
    .insert({
      rep_id: auth.userId,
      prospect_business_name: businessName,
      prospect_contact_name: lead.contact_name || null,
      prospect_email: email,
      prospect_phone: lead.phone || null,
      agreed_monthly_cents: monthlyCents,
      agreed_setup_fee_cents: setupCents,
      status: 'invoice_sent',
      notes: `Auto-created from lead ${lead.id}`,
    })
    .select('id')
    .single()
  if (closeErr || !close) {
    logger.error('Lead payment-link: close insert failed', {
      leadId: lead.id, error: closeErr?.message,
    })
    return NextResponse.json({ error: closeErr?.message || 'Failed to create close' }, { status: 500 })
  }

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
      success_url: `${baseUrl}/payment/success?close=${close.id}`,
      cancel_url: `${baseUrl}/payment/cancel?close=${close.id}`,
      allow_promotion_codes: true,
      metadata: {
        cloudgreet_close_id: close.id,
        cloudgreet_rep_id: auth.userId,
        cloudgreet_lead_id: lead.id,
        cloudgreet_source: 'rep_lead_link',
      },
      subscription_data: {
        metadata: {
          cloudgreet_close_id: close.id,
          cloudgreet_rep_id: auth.userId,
          monthly_cents: String(monthlyCents),
          setup_fee_cents: String(setupCents),
        },
      },
    })
  } catch (e) {
    // Roll back the close we just created so the rep can retry cleanly.
    await supabaseAdmin.from('closes').delete().eq('id', close.id)
    logger.error('Lead payment-link Stripe call failed', {
      repId: auth.userId, leadId: lead.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Stripe error',
    }, { status: 502 })
  }

  if (!session?.url) {
    await supabaseAdmin.from('closes').delete().eq('id', close.id)
    return NextResponse.json({ error: 'Stripe did not return a URL' }, { status: 500 })
  }

  // Advance the lead's workflow status - the rep effectively just
  // sent the proposal.
  await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'proposal_sent',
      last_touched_at: new Date().toISOString(),
    })
    .eq('rep_id', auth.userId)
    .eq('lead_id', lead.id)

  // Best-effort heads-up to the founder.
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
        subject: `${repName} sent a payment link to ${businessName}`,
        text:
`${repName} just generated a Stripe payment link straight from a lead.

  Prospect:  ${businessName}
  Email:     ${email}
  Pricing:   ${monthlyDisp}${setupDisp}

When the prospect pays, the close auto-converts to a client with
rep_id=${auth.userId} stamped - no action needed from you.

Stripe session: ${session.id}
`,
      })
    }
  } catch (e) {
    logger.warn('Lead payment-link founder email failed', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  logger.info('Rep generated lead-direct payment link', {
    repId: auth.userId, leadId: lead.id, closeId: close.id, sessionId: session.id,
  })

  return NextResponse.json({
    success: true,
    url: session.url,
    close_id: close.id,
    expires_at: session.expires_at,
  })
}
