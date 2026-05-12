import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/closes/[id]/account-link
 *   body: { email?, send_email?: boolean }
 *
 * Closes-side counterpart to /api/sales/leads/[id]/account-link.
 * Mints (or reuses) a self-serve account-creation invite for the
 * prospect on this close. Returns the public URL. Optionally emails.
 *
 * Idempotent: reuses an unconsumed invite for the same (rep, email).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: close } = await supabaseAdmin
    .from('closes')
    .select('id, rep_id, prospect_email, prospect_business_name, prospect_contact_name, prospect_phone')
    .eq('id', params.id)
    .maybeSingle()
  if (!close) return NextResponse.json({ error: 'Close not found' }, { status: 404 })
  if (close.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your close' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({} as any))
  const email = String(body?.email || close.prospect_email || '').trim().toLowerCase()
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid prospect email required' }, { status: 400 })
  }
  const sendEmail = body?.send_email === true

  const nowIso = new Date().toISOString()
  const { data: existing } = await supabaseAdmin
    .from('client_account_invites')
    .select('id, token')
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
        lead_id: null,
        prospect_email: email,
        prospect_business_name: close.prospect_business_name || null,
        prospect_contact_name: close.prospect_contact_name || null,
        prospect_phone: close.prospect_phone || null,
      })
      .select('id')
      .single()
    if (insErr || !inserted) {
      logger.error('closes account-link: insert failed', { error: insErr?.message })
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
        const businessName = close.prospect_business_name || 'your business'

        const text = [
          `${repName} sent you a link to create your CloudGreet account for ${businessName}.`,
          'Takes about 30 seconds - you pick the password.',
          '',
          url,
          '',
          'Link expires in 14 days.',
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
          <p style="margin:0 0 14px;">${escapeHtml(repName)} sent you a link to set up your CloudGreet account for <strong>${escapeHtml(businessName)}</strong>.</p>
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
        logger.warn('closes account-link email failed', { closeId: close.id, error: emailError })
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
