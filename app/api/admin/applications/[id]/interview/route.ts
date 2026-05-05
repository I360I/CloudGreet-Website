import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/applications/[id]/interview
 *   { scheduling_url?: string, note?: string }
 *
 * Emails the candidate an interview invite with a scheduling link.
 * Defaults to ADMIN_INTERVIEW_URL (e.g. a Calendly URL) if no link
 * is passed in the body. Bumps the application status to
 * 'interview_scheduled'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const schedulingUrl = (typeof body.scheduling_url === 'string' && body.scheduling_url.trim())
    ? body.scheduling_url.trim()
    : (process.env.ADMIN_INTERVIEW_URL || '')
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1500) : ''

  if (!schedulingUrl) {
    return NextResponse.json({
      error: 'No scheduling link. Pass scheduling_url or set ADMIN_INTERVIEW_URL env var.',
    }, { status: 400 })
  }

  const { data: app, error } = await supabaseAdmin
    .from('rep_applications')
    .select('id, first_name, last_name, email, status')
    .eq('id', params.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({
      error: 'RESEND_API_KEY not configured. Cannot send email.',
    }, { status: 500 })
  }

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
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Let's talk.</div>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:16px;">
            Hi ${app.first_name}, thanks for applying to the sales rep role. I'd like to set up a quick interview. Pick a time that works for you below.
          </p>
          ${note ? `<p style="font-size:14px;color:#374151;line-height:1.6;margin-top:12px;white-space:pre-wrap;">${escapeHtml(note)}</p>` : ''}
          <p style="margin-top:24px;">
            <a href="${schedulingUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 24px;text-decoration:none;font-size:14px;font-weight:500;">Pick an interview time</a>
          </p>
          <p style="font-size:12px;color:#6b7280;line-height:1.6;margin-top:24px;">Or paste this link into a browser: ${schedulingUrl}</p>
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
      to: app.email,
      replyTo,
      subject: 'CloudGreet sales rep interview',
      html,
      text:
`Hi ${app.first_name},

Thanks for applying to the CloudGreet sales rep role. I'd like to set up a quick interview - pick a time that works for you:

${schedulingUrl}
${note ? `\n${note}\n` : ''}
- Anthony Edwards
Founder, CloudGreet`,
    })
  } catch (e) {
    logger.error('Interview email failed', {
      applicationId: app.id, error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Email send failed',
    }, { status: 500 })
  }

  await supabaseAdmin
    .from('rep_applications')
    .update({
      status: 'interview_scheduled',
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', app.id)

  return NextResponse.json({ success: true })
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
