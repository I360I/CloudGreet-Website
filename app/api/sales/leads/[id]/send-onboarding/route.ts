import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { convertCloseToClient } from '@/lib/sales/convert-close'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/send-onboarding
 *   { email?, monthly_cents?, setup_fee_cents? }
 *
 * Creates the prospect's CloudGreet account up-front (user + business
 * with stamped rep_id + the negotiated pricing), then emails them
 * a temp password + the rep's booking link so they can:
 *   1. Log in to their dashboard before/during the demo
 *   2. Pick a slot on the rep's calendar
 *   3. Walk through Cal.com / call-forwarding setup live with the rep
 *
 * Defaults monthly=$499 / setup=$899 if not provided. Prospect can
 * still pay later via /api/sales/leads/[id]/payment-link or
 * /api/sales/closes/[id]/payment-link — we just leave the close
 * in 'pending' status until money lands.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Verify rep owns the lead.
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
  const email = String(body?.email || lead.email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({
      error: "No email — add one to the lead first or pass it in the request.",
    }, { status: 400 })
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email looks invalid' }, { status: 400 })
  }

  // Pricing is no longer captured here — the rep negotiates it on the
  // demo and sets it when sending the actual payment link. Default to
  // 0 so the close row is valid; the payment-link flow updates it.
  const monthlyCents = 0
  const setupCents = 0

  // Optional: rep already booked the demo themselves (or wants to
  // tell the prospect a fixed time). When set, the email reads
  // "Your demo is scheduled for X" instead of "pick a slot".
  const scheduledAtRaw = body?.scheduled_at ? String(body.scheduled_at) : ''
  let scheduledAt: Date | null = null
  if (scheduledAtRaw) {
    const d = new Date(scheduledAtRaw)
    if (!isNaN(d.getTime())) scheduledAt = d
  }

  // 1. Create a close row tying this rep to this prospect's data.
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
      status: 'pending',
      notes: `Onboarding email sent from lead ${lead.id} (pre-payment)`,
    })
    .select('id')
    .single()
  if (closeErr || !close) {
    logger.error('send-onboarding: close insert failed', {
      leadId: lead.id, error: closeErr?.message,
    })
    return NextResponse.json({ error: closeErr?.message || 'Failed to create close' }, { status: 500 })
  }

  // 2. Convert it into a real client (user + business + linked close).
  //    Uses the shared helper so this matches the admin convert path
  //    + the post-payment webhook path. Returns the temp password.
  const result = await convertCloseToClient({ closeId: close.id })
  if (result.ok === false) {
    // Roll back the close we just created so retries can re-do.
    await supabaseAdmin.from('closes').delete().eq('id', close.id)
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { business, user, temp_password } = result.data

  // 3. Pull rep info (name, booking_url) for the email.
  const [{ data: rep }, { data: repProfile }] = await Promise.all([
    supabaseAdmin
      .from('custom_users')
      .select('email, name, first_name, last_name')
      .eq('id', auth.userId)
      .maybeSingle(),
    supabaseAdmin
      .from('sales_reps')
      .select('booking_url')
      .eq('id', auth.userId)
      .maybeSingle(),
  ])
  const repName = rep?.name
    || [rep?.first_name, rep?.last_name].filter(Boolean).join(' ')
    || rep?.email
    || 'your CloudGreet rep'
  const bookingUrl = repProfile?.booking_url || ''

  // 4. Bump lead workflow + log a touch.
  await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'interested',
      last_touched_at: new Date().toISOString(),
    })
    .eq('rep_id', auth.userId)
    .eq('lead_id', lead.id)

  // 5. Email the prospect with login + booking link.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const loginUrl = `${baseUrl}/login`
  let emailSent = false
  let emailError: string | null = null
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const replyTo = rep?.email || process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'

      // Build the schedule line.
      let scheduleLine = ''
      if (scheduledAt) {
        const when = scheduledAt.toLocaleString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        })
        scheduleLine = bookingUrl
          ? `Your demo is scheduled for ${when}:\n  ${bookingUrl}`
          : `Your demo is scheduled for ${when}.`
      } else if (bookingUrl) {
        scheduleLine = `Pick a 15-minute slot that works for you:\n  ${bookingUrl}`
      }

      const text =
`Login:
  URL:      ${loginUrl}
  Email:    ${email}
  Password: ${temp_password}

${scheduleLine}
`
      const subject = scheduledAt
        ? `Your CloudGreet account · demo ${scheduledAt.toLocaleDateString()}`
        : `Your CloudGreet account`
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: email,
        replyTo,
        subject,
        text,
      })
      emailSent = true
    } catch (e) {
      emailError = e instanceof Error ? e.message : 'Unknown'
      logger.warn('send-onboarding email failed', {
        leadId: lead.id, repId: auth.userId, error: emailError,
      })
    }
  } else {
    emailError = 'RESEND_API_KEY not configured'
    logger.warn('send-onboarding: skipped email — no Resend key', { leadId: lead.id })
  }

  logger.info('Rep sent onboarding email + provisioned client', {
    repId: auth.userId, leadId: lead.id, businessId: business.id, email, emailSent,
  })

  return NextResponse.json({
    success: true,
    business: { id: business.id, business_name: business.business_name },
    user: { id: user.id, email: user.email },
    login_url: loginUrl,
    temp_password,
    booking_url: bookingUrl || null,
    email_sent: emailSent,
    ...(emailError ? { email_error: emailError } : {}),
  })
}
