import { logger } from './monitoring'

/**
 * Minimal transactional email sender used by the job queue (send_email jobs,
 * e.g. contact-form notifications). Sends through Brevo, the same transport the
 * campaign sender uses. Keeps the generic {to, subject, html} shape the queue
 * handlers expect.
 */
export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export async function sendEmail(input: SendEmailInput): Promise<{ messageId: string | null; error: string | null }> {
  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) {
    logger.error('sendEmail: BREVO_API_KEY is not set', { to: input.to, subject: input.subject })
    return { messageId: null, error: 'BREVO_API_KEY is not set' }
  }

  const fromEmail = input.from || process.env.BREVO_FROM_EMAIL || 'noreply@cloudgreet.com'

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'CloudGreet', email: fromEmail },
        to: [{ email: input.to }],
        ...(input.replyTo ? { replyTo: { email: input.replyTo } } : {}),
        subject: input.subject,
        htmlContent: input.html,
        ...(input.text ? { textContent: input.text } : {}),
      }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { message?: string }
      const error = errBody.message || `Brevo error ${res.status}`
      logger.error('sendEmail: Brevo send failed', { to: input.to, status: res.status, error })
      return { messageId: null, error }
    }

    const data = await res.json() as { messageId?: string }
    return { messageId: data.messageId || null, error: null }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'unknown'
    logger.error('sendEmail: request failed', { to: input.to, error })
    return { messageId: null, error }
  }
}
