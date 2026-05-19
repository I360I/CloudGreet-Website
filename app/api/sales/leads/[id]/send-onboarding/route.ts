import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { convertCloseToClient } from '@/lib/sales/convert-close'
import { proxyBookingUrl } from '@/lib/booking-url'

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
 * Monthly + setup default to 0 if not provided; reps negotiate the
 * actual amount per close. Prospect can still pay later via
 * /api/sales/leads/[id]/payment-link or
 * /api/sales/closes/[id]/payment-link - we just leave the close
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
      error: "No email - add one to the lead first or pass it in the request.",
    }, { status: 400 })
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email looks invalid' }, { status: 400 })
  }

  // Pricing is no longer captured here - the rep negotiates it on the
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
  // Raw cal.com URL stays in the close/response for tracking; the
  // proxied version is what we put in the email body to dodge mail.com
  // / Outlook URL filters that flag bare cal.com links as suspicious.
  const rawBookingUrl = repProfile?.booking_url || ''
  const bookingUrl = proxyBookingUrl(rawBookingUrl)

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

      // Schedule + slot copy
      let scheduleHeading = ''
      let scheduleAction = ''
      if (scheduledAt) {
        const when = scheduledAt.toLocaleString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        })
        scheduleHeading = `Your demo is scheduled for ${when}.`
        scheduleAction = bookingUrl ? `View on Cal.com` : ''
      } else if (bookingUrl) {
        scheduleHeading = 'Pick a 15-minute slot that works for you.'
        scheduleAction = 'Open Cal.com'
      }

      const text = [
        'Your CloudGreet account',
        '',
        `Sign in:  ${loginUrl}`,
        `Email:    ${email}`,
        `Password: ${temp_password}`,
        '',
        scheduleHeading,
        bookingUrl || '',
      ].filter(Boolean).join('\n')

      const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Your account is ready.</div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;line-height:1.6;">
            <tr><td style="padding:6px 0;color:#6b7280;width:90px;">Sign in</td><td style="padding:6px 0;"><a href="${loginUrl}" style="color:#111827;text-decoration:none;border-bottom:1px solid #d1d5db;">${loginUrl.replace(/^https?:\/\//, '')}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;color:#111827;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Password</td><td style="padding:6px 0;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;color:#111827;">${escapeHtml(temp_password)}</td></tr>
          </table>
        </td></tr>
        ${scheduleHeading ? `
        <tr><td style="padding:24px 32px 0;">
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;" />
          <div style="font-size:14px;color:#111827;margin-bottom:14px;">${escapeHtml(scheduleHeading)}</div>
          ${bookingUrl ? `<a href="${bookingUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;padding:10px 18px;font-weight:500;">${escapeHtml(scheduleAction)}</a>` : ''}
        </td></tr>` : ''}
        <tr><td style="padding:28px 32px 32px;">
          <div style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
            CloudGreet · AI receptionist for service businesses
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

      const subject = scheduledAt
        ? `Your CloudGreet account · demo ${scheduledAt.toLocaleDateString()}`
        : `Your CloudGreet account`
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: email,
        replyTo,
        subject,
        text,
        html,
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
    logger.warn('send-onboarding: skipped email - no Resend key', { leadId: lead.id })
  }

  logger.info('Rep sent onboarding email + provisioned client', {
    repId: auth.userId, leadId: lead.id, businessId: business.id, email, emailSent,
  })

  // FYI to Anthony - rep just spun up a new client + sent booking link.
  void (async () => {
    try {
      const { emailFounderAlert } = await import('@/lib/notifications/founder-alert')
      await emailFounderAlert({
        subject: `Rep sent booking link: ${business.business_name}`,
        body: `${repName} sent a booking link to ${business.business_name}. Account was provisioned at the same time.`,
        replyTo: rep?.email || undefined,
        metadata: {
          business_id: business.id,
          business_name: business.business_name,
          client_email: user.email,
          rep: repName,
          rep_email: rep?.email,
          lead_id: lead.id,
          scheduled_demo: scheduledAt ? scheduledAt.toISOString() : 'none',
          email_sent: emailSent,
        },
      })
    } catch { /* non-fatal */ }
  })()

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
