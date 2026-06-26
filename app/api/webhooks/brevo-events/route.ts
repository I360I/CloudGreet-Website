import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/webhooks/brevo-events
 * Handles Brevo transactional email events (bounce, unsubscribe, complaint).
 *
 * Configure in Brevo:
 *   Transactional → Settings → Webhooks → Add webhook
 *   URL: https://cloudgreet.com/api/webhooks/brevo-events
 *   Events: hard_bounce, soft_bounce, unsubscribed, spam
 *
 * Brevo includes our custom headers (X-Lead-Id, X-Campaign-Id) in event payloads.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  // Brevo events use snake_case event names
  const event: string = body.event || ''
  const messageId: string = body['message-id'] || body.messageId || body.MessageId || ''
  const headers: Record<string, string> = body.headers || {}
  const leadId: string = headers['X-Lead-Id'] || headers['x-lead-id'] || ''
  const campaignId: string = headers['X-Campaign-Id'] || headers['x-campaign-id'] || ''

  logger.info('brevo events webhook', { event, messageId: messageId.slice(0, 40), leadId })

  if (event === 'hard_bounce' || event === 'soft_bounce' || event === 'invalid_email') {
    const update: Record<string, unknown> = {
      status: 'bounced',
      next_follow_up_at: null,
      error: event === 'soft_bounce' ? 'Soft bounce' : 'Hard bounce',
    }

    let matched = false

    if (leadId) {
      const { error } = await supabaseAdmin
        .from('email_leads')
        .update(update)
        .eq('id', leadId)
      matched = !error
    }

    if (!matched && messageId) {
      const { error } = await supabaseAdmin
        .from('email_leads')
        .update(update)
        .eq('resend_message_id', messageId)
      matched = !error
    }

    if (matched && campaignId) {
      // Increment bounce_count on campaign
      const { data: camp } = await supabaseAdmin
        .from('email_campaigns')
        .select('bounce_count')
        .eq('id', campaignId)
        .single()
      if (camp) {
        await supabaseAdmin
          .from('email_campaigns')
          .update({ bounce_count: (camp.bounce_count || 0) + 1 })
          .eq('id', campaignId)
      }
    }

    logger.info('brevo events: bounce handled', { event, leadId, matched })
  } else if (event === 'unsubscribed' || event === 'spam') {
    const update: Record<string, unknown> = {
      status: 'unsubscribed',
      next_follow_up_at: null,
      error: event === 'spam' ? 'Spam complaint' : 'Unsubscribed',
    }

    if (leadId) {
      await supabaseAdmin.from('email_leads').update(update).eq('id', leadId)
    } else if (messageId) {
      await supabaseAdmin.from('email_leads').update(update).eq('resend_message_id', messageId)
    }

    logger.info('brevo events: unsubscribe handled', { event, leadId })
  }

  return NextResponse.json({ ok: true })
}
