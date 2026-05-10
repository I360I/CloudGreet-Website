import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { authRateLimit } from '@/lib/rate-limiting-redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email }
 *
 * Always returns 200 so attackers can't enumerate which emails have
 * accounts. If the email is on file, generates a single-use token,
 * stores its sha256 hash (1h expiry), and emails the reset link. If
 * Resend isn't configured, the request still 200s but logs a warning.
 */
export async function POST(request: NextRequest) {
  const rl = await authRateLimit(request)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests, try again in a few minutes' },
      { status: 429, headers: rl.headers },
    )
  }

  let body: any = {}
  try { body = await request.json() } catch { /* allow empty */ }
  const email = String(body?.email || '').trim().toLowerCase()
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
  }

  // Always return success - don't reveal whether the email exists.
  const genericOk = NextResponse.json(
    { success: true, message: 'If that email is on file, a reset link is on its way.' },
    { headers: rl.headers },
  )

  // Case-insensitive lookup so a "John@example.com" stored in the DB
  // matches a "john@example.com" submission. Without ilike, mixed-case
  // accounts silently never receive a reset email.
  const { data: user } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name')
    .ilike('email', email)
    .maybeSingle()

  if (!user) {
    logger.info('forgot-password: no user for email (returning generic ok)', { email })
    return genericOk
  }

  // Mint a token: 32 random bytes hex. Store sha256(token) so a DB
  // leak doesn't expose live reset links.
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1h
  const requestIp = request.headers.get('x-forwarded-for')?.split(',')[0] || null

  const { error: insertErr } = await supabaseAdmin
    .from('password_reset_tokens')
    .insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      request_ip: requestIp,
    })
  if (insertErr) {
    logger.error('forgot-password: token insert failed', { userId: user.id, error: insertErr.message })
    // Still return generic success - we don't want to leak that the
    // user exists by surfacing a different shape on insert error.
    return genericOk
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    logger.warn('forgot-password: RESEND_API_KEY missing - reset email NOT sent', { userId: user.id })
    return genericOk
  }

  try {
    const resend = new Resend(resendKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
    const replyTo = process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'
    const firstName = (user.first_name || '').trim()
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

    const text = [
      greeting,
      '',
      'Click the link below to reset your CloudGreet password. The link is good for 1 hour.',
      '',
      resetUrl,
      '',
      "If you didn't request this, ignore this email - your password won't change.",
      '',
      'CloudGreet',
    ].join('\n')

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Reset your password</div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;font-size:14px;line-height:1.6;color:#374151;">
          <p style="margin:0 0 12px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 20px;">Click the button below to set a new password. The link is good for 1 hour.</p>
          <p style="margin:0 0 24px;">
            <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;padding:10px 18px;font-weight:500;">Reset password</a>
          </p>
          <p style="margin:0 0 12px;font-size:12px;color:#6b7280;">Or paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#6b7280;word-break:break-all;">${resetUrl}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">If you didn't request this, ignore this email - your password won't change.</p>
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
      subject: 'Reset your CloudGreet password',
      text,
      html,
    })
  } catch (e) {
    logger.warn('forgot-password: email send failed (still returning generic ok)', {
      userId: user.id, error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  return genericOk
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c] as string)
}
