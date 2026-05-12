import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/account-link
 *   body: { email?, send_email?: boolean }
 *
 * Mints (or reuses) a one-time self-serve account-creation invite for
 * the prospect attached to this lead. Returns the public URL.
 *
 * If `send_email: true`, also emails the prospect a short message with
 * the link. If false (default), the URL is returned for the rep to
 * copy + paste during the demo call.
 *
 * Reuses an existing unconsumed invite for the same (rep, email) pair
 * so re-clicks return the same URL instead of stacking rows.
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
  if (!assignment) return NextResponse.json({ error: 'Not your lead' }, { status: 404 })

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, contact_name, phone, email')
    .eq('id', params.id)
    .maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const body = await request.json().catch(() => ({} as any))
  const email = String(body?.email || lead.email || '').trim().toLowerCase()
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid prospect email required' }, { status: 400 })
  }
  const sendEmail = body?.send_email === true

  // Reuse a fresh invite if one already exists for this rep+email so the
  // rep can copy the same link twice without stacking rows.
  const nowIso = new Date().toISOString()
  const { data: existing } = await supabaseAdmin
    .from('client_account_invites')
    .select('id, token, expires_at, consumed_at')
    .eq('rep_id', auth.userId)
    .eq('prospect_email', email)
    .is('consumed_at', null)
    .gte('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let token = existing?.token || ''
  let inviteId = existing?.id || ''
  if (!token) {
    token = crypto.randomBytes(24).toString('base64url')
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('client_account_invites')
      .insert({
        token,
        rep_id: auth.userId,
        lead_id: lead.id,
        prospect_email: email,
        prospect_business_name: lead.business_name || null,
        prospect_contact_name: lead.contact_name || null,
        prospect_phone: lead.phone || null,
      })
      .select('id')
      .single()
    if (insErr || !inserted) {
      logger.error('account-link: invite insert failed', { error: insErr?.message })
      return NextResponse.json({ error: insErr?.message || 'Failed to create invite' }, { status: 500 })
    }
    inviteId = inserted.id
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const url = `${baseUrl}/create-account?token=${encodeURIComponent(token)}`

  let emailSent = false
  let emailError: string | null = null
  if (sendEmail) {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      emailError = 'RESEND_API_KEY not configured'
    } else {
      try {
        const { data: rep } = await supabaseAdmin
          .from('custom_users')
          .select('email, name, first_name, last_name')
          .eq('id', auth.userId)
          .maybeSingle()
        const repName = rep?.name
          || [rep?.first_name, rep?.last_name].filter(Boolean).join(' ')
          || rep?.email
          || 'your CloudGreet rep'
        const resend = new Resend(resendKey)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
        const replyTo = rep?.email || process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'
        const businessName = lead.business_name || 'your business'

        const text = [
          `Hi${lead.contact_name ? ` ${lead.contact_name}` : ''},`,
          '',
          `${repName} sent you a quick link to create your CloudGreet account for ${businessName}.`,
          'It takes about 30 seconds - you pick your own password and you are in.',
          '',
          url,
          '',
          'Link expires in 14 days. Reply to this email if anything looks off.',
        ].join('\n')

        const safeUrl = url.replace(/&/g, '&amp;')
        const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Create your account</div>
        </td></tr>
        <tr><td style="padding:16px 32px 8px;font-size:14px;line-height:1.6;color:#374151;">
          <p style="margin:0 0 14px;">${escapeHtml(repName)} sent you a quick link to set up your CloudGreet account for <strong>${escapeHtml(businessName)}</strong>.</p>
          <p style="margin:0 0 18px;">It takes about 30 seconds - pick your password and you're in.</p>
          <p style="margin:0 0 18px;">
            <a href="${safeUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;padding:12px 22px;font-weight:500;">Create my account</a>
          </p>
          <p style="margin:0;font-size:12px;color:#6b7280;">Link expires in 14 days.</p>
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
          subject: 'Create your CloudGreet account',
          text,
          html,
        })
        emailSent = true
      } catch (e) {
        emailError = e instanceof Error ? e.message : 'Unknown'
        logger.warn('account-link email failed', { leadId: lead.id, error: emailError })
      }
    }
  }

  return NextResponse.json({
    success: true,
    invite_id: inviteId,
    url,
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
