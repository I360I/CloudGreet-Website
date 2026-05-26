import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { logger } from '@/lib/monitoring'

const CRON_SECRET = process.env.CRON_SECRET

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  if (!CRON_SECRET) return false
  return request.headers.get('x-cron-secret') === CRON_SECRET
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { subject?: unknown; markdown?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : ''
  const markdown = typeof payload.markdown === 'string' ? payload.markdown : ''
  if (!subject || !markdown) {
    return NextResponse.json({ error: 'subject and markdown required' }, { status: 400 })
  }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const to = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet · scheduled digest</div>
          <div style="font-size:16px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">${escapeHtml(subject)}</div>
        </td></tr>
        <tr><td style="padding:8px 28px 24px;">
          <pre style="margin:0;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.55;color:#111827;white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(markdown)}</pre>
        </td></tr>
        <tr><td style="padding:0 28px 24px;">
          <div style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px;">
            Sent by a scheduled CloudGreet agent · routine output also viewable at claude.ai/code/routines
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  try {
    const resend = new Resend(key)
    const result = await resend.emails.send({
      from: `CloudGreet <${fromEmail}>`,
      to,
      subject,
      text: markdown,
      html,
    })
    return NextResponse.json({ success: true, id: result.data?.id })
  } catch (error) {
    logger.warn('digest-relay send failed', {
      subject,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'send failed' },
      { status: 500 },
    )
  }
}
