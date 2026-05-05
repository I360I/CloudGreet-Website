import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/applications/[id]/hire
 *
 * Issues a sales-rep invite for the candidate behind this application.
 * Mirrors POST /api/admin/sales/reps but seeded from application data
 * and bumps the application status to 'hired'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: app, error: appErr } = await supabaseAdmin
    .from('rep_applications')
    .select('id, first_name, last_name, email')
    .eq('id', params.id)
    .maybeSingle()
  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 })
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const email = (app.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Application has no email' }, { status: 400 })

  // If a custom_users row already exists at this email, refuse - the
  // admin can hand-link via the Sales tools instead.
  const { data: existing } = await supabaseAdmin
    .from('custom_users')
    .select('id, role')
    .eq('email', email)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({
      error: `An account already exists for ${email} (role: ${existing.role}).`,
    }, { status: 409 })
  }

  // Reuse an open invite if one is already on file rather than piling
  // up duplicate tokens.
  let token: string | null = null
  const { data: openInvite } = await supabaseAdmin
    .from('sales_rep_invites')
    .select('token, expires_at')
    .eq('email', email)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (openInvite) {
    token = openInvite.token
  } else {
    token = crypto.randomBytes(24).toString('base64url')
    const { error: insertErr } = await supabaseAdmin
      .from('sales_rep_invites')
      .insert({ token, email, invited_by: auth.userId })
    if (insertErr) {
      logger.error('Hire: invite insert failed', { email, error: insertErr.message })
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const acceptUrl = `${baseUrl}/sales/accept-invite?token=${encodeURIComponent(token)}`

  const resendKey = process.env.RESEND_API_KEY
  let emailSent = false
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const replyTo = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
      const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Welcome to the team.</div>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:16px;">
            Hi ${app.first_name}, you're in. Click below to set up your rep account (link expires in 14 days).
          </p>
          <p style="margin-top:24px;">
            <a href="${acceptUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 24px;text-decoration:none;font-size:14px;font-weight:500;">Set up my account</a>
          </p>
          <p style="font-size:12px;color:#6b7280;line-height:1.6;margin-top:16px;">Or paste this link into a browser: ${acceptUrl}</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:24px;">
            You'll be asked to:
          </p>
          <ol style="font-size:14px;color:#374151;line-height:1.7;margin:8px 0 0 0;padding-left:18px;">
            <li>Pick a password</li>
            <li>Review and sign the contractor agreement</li>
            <li>Connect your bank via Stripe so we can pay you weekly</li>
          </ol>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:24px;">
            - Anthony Edwards<br/>Founder, CloudGreet
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: email,
        replyTo,
        subject: 'Your CloudGreet sales rep invite',
        html,
        text:
`Hi ${app.first_name},

You're in. Set up your rep account here (link expires in 14 days):

${acceptUrl}

You'll be asked to:
  1. Pick a password
  2. Review and sign the contractor agreement
  3. Connect your bank via Stripe so we can pay you weekly

- Anthony Edwards
Founder, CloudGreet`,
      })
      emailSent = true
    } catch (e) {
      logger.warn('Hire email send failed', {
        applicationId: app.id, error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  }

  await supabaseAdmin
    .from('rep_applications')
    .update({
      status: 'hired',
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', app.id)

  return NextResponse.json({
    success: true,
    accept_url: acceptUrl,
    email_sent: emailSent,
  })
}
