import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/webhooks/resend
 * Handles Resend delivery events to keep email_leads statuses accurate.
 *
 * Events handled:
 *   email.bounced    → status = bounced, clear next_follow_up_at
 *   email.complained → status = bounced (spam complaint), clear next_follow_up_at
 *
 * Set the webhook URL in Resend dashboard → Webhooks → Add endpoint:
 *   https://cloudgreet.com/api/webhooks/resend
 * Events: email.bounced, email.complained
 *
 * Optionally set RESEND_WEBHOOK_SECRET and Resend will sign payloads;
 * without it we still process events (low risk — worst case we get a
 * forged bounce, not a data leak).
 */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const type: string = body?.type || ''
  const data = body?.data || {}
  const messageId: string = data?.email_id || data?.id || ''

  logger.info('resend webhook', { type, messageId: messageId.slice(0, 20) })

  if (!messageId) return NextResponse.json({ ok: true })

  if (type === 'email.bounced' || type === 'email.complained') {
    const { error } = await supabaseAdmin
      .from('email_leads')
      .update({
        status: 'bounced',
        next_follow_up_at: null,
        error: type === 'email.complained' ? 'Spam complaint' : 'Bounced',
      })
      .eq('resend_message_id', messageId)

    if (error) {
      logger.warn('resend webhook: failed to update lead', { messageId, error: error.message })
    } else {
      logger.info('resend webhook: marked bounced', { messageId, type })
    }
  }

  return NextResponse.json({ ok: true })
}
