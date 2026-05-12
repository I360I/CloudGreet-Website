import { Resend } from 'resend'
import { logger } from '@/lib/monitoring'

/**
 * Send a one-shot "FYI" email to the founder (Anthony) when a
 * rep-driven event happens that he wants to be aware of:
 *   - Rep created a client account
 *   - Rep sent a booking link
 *   - Rep sent a payment link
 *   - etc.
 *
 * Goes to FOUNDER_EMAIL (default anthony@cloudgreet.com). Failure is
 * silent and logged - never break the rep-flow because the FYI email
 * couldn't send. Resend only; falls back to no-op if RESEND_API_KEY
 * isn't set.
 */
export async function emailFounderAlert(input: {
  subject: string
  /** Short plain-text body. Will be wrapped in a minimal HTML shell. */
  body: string
  /** Optional metadata block rendered as a small monospace block. */
  metadata?: Record<string, string | number | boolean | null | undefined>
  /** Optional reply-to (e.g. the rep's email so a reply goes back to them). */
  replyTo?: string
}): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const to = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'

  const metaRows = Object.entries(input.metadata || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;width:140px;">${k}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;color:#111827;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:12px;">${String(v)}</td></tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:24px 24px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet · rep activity</div>
          <div style="font-size:16px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">${input.subject}</div>
        </td></tr>
        <tr><td style="padding:8px 24px 0;font-size:14px;line-height:1.55;color:#374151;white-space:pre-wrap;">${input.body}</td></tr>
        ${metaRows ? `<tr><td style="padding:14px 24px 0;"><table role="presentation" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;width:100%;">${metaRows}</table></td></tr>` : ''}
        <tr><td style="padding:20px 24px 24px;">
          <div style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px;">
            This is an automated FYI. Set FOUNDER_EMAIL to redirect.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  try {
    const resend = new Resend(key)
    await resend.emails.send({
      from: `CloudGreet <${fromEmail}>`,
      to,
      replyTo: input.replyTo || undefined,
      subject: input.subject,
      text: [
        input.body,
        '',
        ...Object.entries(input.metadata || {})
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${k}: ${v}`),
      ].join('\n'),
      html,
    })
  } catch (e) {
    logger.warn('emailFounderAlert send failed', {
      subject: input.subject,
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }
}
