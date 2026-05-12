import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { convertCloseToClient } from '@/lib/sales/convert-close'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/create-account
 *   { email? }
 *
 * Creates a CloudGreet account for the lead's business directly, without
 * the booking-link/demo flow. Use this when the prospect has already
 * booked or paid through some other path (called in, manual close,
 * etc.) and the rep just needs to spin up the dashboard account so they
 * can log in.
 *
 * Mirrors the send-onboarding setup (close -> user + business via
 * convertCloseToClient) but emails ONLY login credentials, no demo
 * booking link, no rep name in the body. The close created here goes
 * straight to status='converted' since there's no pending demo.
 *
 * Idempotent: if the lead already has a linked business via a prior
 * close, returns the existing record without spawning duplicates.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Rep must own the lead.
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) {
    return NextResponse.json({ error: 'Not your lead' }, { status: 404 })
  }

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, contact_name, phone, email, website, address, city, state, zip')
    .eq('id', params.id)
    .maybeSingle()
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({} as any))
  const email = String(body?.email || lead.email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({
      error: "Lead has no email - add one to the lead first or pass it in the request.",
    }, { status: 400 })
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email looks invalid' }, { status: 400 })
  }

  // Reuse an existing close for this lead+rep if one already exists -
  // keeps this idempotent so repeated clicks don't pile up close rows.
  const businessName = lead.business_name || 'Unknown'
  let closeId: string
  const { data: existingClose } = await supabaseAdmin
    .from('closes')
    .select('id, business_id')
    .eq('rep_id', auth.userId)
    .eq('prospect_business_name', businessName)
    .eq('prospect_email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingClose?.business_id) {
    // Already converted. Just return success so the rep sees the
    // confirmation without creating another close.
    return NextResponse.json({
      success: true,
      already_existed: true,
      business_id: existingClose.business_id,
      message: 'Account already exists for this lead.',
    })
  }

  if (existingClose) {
    closeId = existingClose.id
  } else {
    const { data: close, error: closeErr } = await supabaseAdmin
      .from('closes')
      .insert({
        rep_id: auth.userId,
        prospect_business_name: businessName,
        prospect_contact_name: lead.contact_name || null,
        prospect_email: email,
        prospect_phone: lead.phone || null,
        agreed_monthly_cents: 0,
        agreed_setup_fee_cents: 0,
        status: 'pending',
        notes: `Account created directly from lead ${lead.id} (no booking-link flow)`,
      })
      .select('id')
      .single()
    if (closeErr || !close) {
      logger.error('create-account: close insert failed', {
        leadId: lead.id, error: closeErr?.message,
      })
      return NextResponse.json({ error: closeErr?.message || 'Failed to create close' }, { status: 500 })
    }
    closeId = close.id
  }

  // Convert to a real client - user + business + linked close.
  const result = await convertCloseToClient({ closeId })
  if (result.ok === false) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { business, user, temp_password } = result.data

  // Best-effort: backfill scraped lead data onto the new business so
  // the contractor's profile is pre-populated.
  try {
    const { syncBusinessFromLead } = await import('@/lib/business-sync')
    await syncBusinessFromLead({ businessId: business.id, leadId: lead.id })
  } catch { /* non-fatal */ }

  // Bump lead workflow.
  await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'converted',
      last_touched_at: new Date().toISOString(),
    })
    .eq('rep_id', auth.userId)
    .eq('lead_id', lead.id)

  // Email the new owner their login info.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const loginUrl = `${baseUrl}/login`
  let emailSent = false
  let emailError: string | null = null
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && temp_password) {
    try {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const replyTo = process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'

      const text = [
        `Your CloudGreet account is ready.`,
        ``,
        `Log in at ${loginUrl}`,
        ``,
        `Email:    ${email}`,
        `Password: ${temp_password}`,
        ``,
        `You can change the password after first login under Settings.`,
        ``,
        `Inside the dashboard you'll connect your Cal.com calendar and set your business hours - that's what wires up the AI receptionist to start answering calls and booking jobs for you.`,
      ].join('\n')

      const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Your account is ready</div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;font-size:14px;line-height:1.6;color:#374151;">
          <p style="margin:0 0 16px;">Welcome to CloudGreet. Log in below to connect your Cal.com and set your AI receptionist live.</p>
          <p style="margin:0 0 16px;">
            <a href="${loginUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;padding:10px 18px;font-weight:500;">Log in</a>
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;background:#fafaf9;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#111827;margin:8px 0 20px;">
            <tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;"><span style="color:#9ca3af;">email</span> &nbsp;${email}</td></tr>
            <tr><td style="padding:10px 14px;"><span style="color:#9ca3af;">password</span> &nbsp;${temp_password}</td></tr>
          </table>
          <p style="margin:0 0 12px;font-size:13px;color:#374151;">Change your password after the first login under Settings.</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">Questions? Reply to this email.</p>
        </td></tr>
        <tr><td style="padding:28px 32px 32px;">
          <div style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
            CloudGreet · AI receptionist for service businesses
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: email,
        replyTo,
        subject: 'Your CloudGreet account is ready',
        text,
        html,
      })
      emailSent = true
    } catch (e) {
      emailError = e instanceof Error ? e.message : 'Unknown'
      logger.warn('create-account: email send failed', { leadId: lead.id, error: emailError })
    }
  }

  // FYI to Anthony - reps direct-creating accounts is a moment he
  // wants visibility into without having to check /admin/clients.
  void (async () => {
    try {
      const { data: rep } = await supabaseAdmin
        .from('custom_users')
        .select('email, name, first_name, last_name')
        .eq('id', auth.userId)
        .maybeSingle()
      const repName =
        rep?.name ||
        [rep?.first_name, rep?.last_name].filter(Boolean).join(' ').trim() ||
        rep?.email ||
        'a rep'
      const { emailFounderAlert } = await import('@/lib/notifications/founder-alert')
      await emailFounderAlert({
        subject: `Rep created client account: ${business.business_name}`,
        body: `${repName} just spun up a CloudGreet account for ${business.business_name} directly from a lead (no booking-link flow).`,
        replyTo: rep?.email || undefined,
        metadata: {
          business_id: business.id,
          business_name: business.business_name,
          client_email: user.email,
          rep: repName,
          rep_email: rep?.email,
          lead_id: lead.id,
        },
      })
    } catch { /* non-fatal */ }
  })()

  return NextResponse.json({
    success: true,
    business_id: business.id,
    business_name: business.business_name,
    user_id: user.id,
    user_email: user.email,
    temp_password,
    email_sent: emailSent,
    email_error: emailError,
  })
}
