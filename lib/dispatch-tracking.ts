import { supabaseAdmin } from './supabase'
import { telnyxClient } from './telnyx'
import { logger } from './monitoring'

/**
 * Delivery tracking + auto-retry for owner dispatch texts (the "Steve, call
 * this customer back" messages). A Telnyx 200 only means the message was
 * accepted, not delivered - so we record each send, watch the delivery
 * receipt (message.finalized) on the SMS webhook, and resend on failure.
 * The dispatch safety net handles "never attempted"; this handles "attempted
 * but didn't land".
 */

const MAX_ATTEMPTS = 3
const FAILED_STATUSES = new Set(['delivery_failed', 'sending_failed', 'failed', 'expired'])

export async function recordDispatchSend(args: {
  businessId: string
  retellCallId?: string | null
  recipientPhone: string
  fromNumber: string
  body: string
  telnyxMessageId: string | null
  /** 'dispatch' (owner call-back text) or 'report_alert' (text-to-book report link). */
  kind?: 'dispatch' | 'report_alert'
}): Promise<void> {
  try {
    await supabaseAdmin.from('dispatch_notifications').insert({
      business_id: args.businessId,
      retell_call_id: args.retellCallId ?? null,
      recipient_phone: args.recipientPhone,
      from_number: args.fromNumber,
      body: args.body,
      telnyx_message_id: args.telnyxMessageId,
      status: 'sent',
      attempts: 1,
      kind: args.kind ?? 'dispatch',
    })
  } catch (e) {
    logger.warn('recordDispatchSend failed', { error: e instanceof Error ? e.message : 'unknown' })
  }
}

/** Sender to retry from: a configured fallback number if distinct, else same. */
function retryFrom(original: string): string {
  const fallback = process.env.CLOUDGREET_NOTIFICATIONS_FROM_FALLBACK || ''
  if (fallback && fallback !== original) return fallback
  return original
}

/**
 * Process an outbound delivery receipt. Marks delivered, or on a failed
 * status resends (up to MAX_ATTEMPTS) and alerts admin once exhausted.
 * No-op for message ids we aren't tracking. Idempotent: a retry rewrites
 * telnyx_message_id, so duplicate receipts for the old id find no row.
 */
export async function handleDispatchDlr(
  messageId: string,
  toStatus: string,
  errorText?: string,
): Promise<void> {
  if (!messageId) return
  const status = (toStatus || '').toLowerCase()

  const { data: row } = await supabaseAdmin
    .from('dispatch_notifications')
    .select('id, body, recipient_phone, from_number, attempts')
    .eq('telnyx_message_id', messageId)
    .maybeSingle()
  if (!row) return // not a tracked dispatch (or already superseded by a retry)

  if (status === 'delivered') {
    await supabaseAdmin.from('dispatch_notifications')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', (row as any).id)
    return
  }
  if (!FAILED_STATUSES.has(status)) return // queued/sent/sending - wait for the final status

  const attempts = (row as any).attempts || 1
  if (attempts >= MAX_ATTEMPTS) {
    await supabaseAdmin.from('dispatch_notifications')
      .update({ status: 'exhausted', last_error: errorText || status, updated_at: new Date().toISOString() })
      .eq('id', (row as any).id)
    void import('./admin-notify').then(({ sendAdminCopyIfDistinct }) =>
      sendAdminCopyIfDistinct({
        clientName: 'CloudGreet',
        ownerPhone: (row as any).recipient_phone,
        kind: 'dispatch',
        body: `DISPATCH UNDELIVERED after ${attempts} attempts to ${(row as any).recipient_phone}. Original message:\n${(row as any).body}`,
      }),
    ).catch(() => {})
    logger.error('dispatch exhausted retries', { messageId, recipient: (row as any).recipient_phone })
    return
  }

  const from = retryFrom((row as any).from_number)
  try {
    const sent = await telnyxClient.sendSMS((row as any).recipient_phone, (row as any).body, from)
    const newId = (sent as any)?.data?.id || null
    await supabaseAdmin.from('dispatch_notifications').update({
      telnyx_message_id: newId,
      from_number: from,
      status: 'sent',
      attempts: attempts + 1,
      last_error: `retry after ${status}`,
      updated_at: new Date().toISOString(),
    }).eq('id', (row as any).id)
    logger.info('dispatch retried after failed delivery', { from, attempt: attempts + 1 })
  } catch (e) {
    await supabaseAdmin.from('dispatch_notifications').update({
      status: 'delivery_failed',
      last_error: e instanceof Error ? e.message : 'retry send failed',
      updated_at: new Date().toISOString(),
    }).eq('id', (row as any).id)
    logger.warn('dispatch retry send failed', { error: e instanceof Error ? e.message : 'unknown' })
  }
}
