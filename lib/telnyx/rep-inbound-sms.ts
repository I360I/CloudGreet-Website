import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { notifyRep } from '@/lib/notifications/notify'

/**
 * Inbound SMS to a rep's dialer DID (replies to setter/sales follow-up
 * texts). Shared by the main Telnyx SMS webhook (which the Messaging
 * Profile already points at) and the standalone rep-sms-webhook route.
 *
 *  - Logs the reply in rep_messages (matched to the rep who owns the
 *    receiving number, and to the lead by the sender's phone).
 *  - Notifies the owning rep through the notifications bell.
 *  - Mirrors it into the lead's note thread.
 *  - COMPLIANCE (non-negotiable): STOP/UNSUBSCRIBE/etc. replies flip
 *    the lead assignment to do_not_call immediately.
 *
 * Returns true when the receiving number belongs to a rep (message
 * handled), false when it isn't a rep DID (caller keeps routing).
 */

const STOP_WORDS = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|remove)\b/i

export async function handleRepInboundSms(args: {
  fromNumber: string
  toNumber: string
  text: string
  telnyxMessageId?: string | null
}): Promise<boolean> {
  const { fromNumber, toNumber, text } = args
  if (!fromNumber || !toNumber) return false

  try {
    // Which rep owns the DID that received this?
    const { data: numRow } = await supabaseAdmin
      .from('sales_rep_phone_numbers')
      .select('rep_id')
      .eq('phone_number', toNumber)
      .maybeSingle()
    const repId: string | null = numRow?.rep_id || null
    if (!repId) return false

    // Match the sender to a lead by phone (leads store E.164).
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, business_name')
      .eq('phone', fromNumber)
      .maybeSingle()

    await supabaseAdmin.from('rep_messages').insert({
      rep_id: repId,
      lead_id: lead?.id || null,
      direction: 'inbound',
      from_number: fromNumber,
      to_number: toNumber,
      body: text,
      telnyx_message_id: args.telnyxMessageId || null,
      status: 'received',
    })

    // Bell notification for the owning rep. Link only for setters -
    // /setter/messages is the only thread UI; sales has none yet.
    const { data: repUser } = await supabaseAdmin
      .from('custom_users')
      .select('role')
      .eq('id', repId)
      .maybeSingle()
    await notifyRep(repId, {
      type: 'sms_reply',
      title: `New text from ${lead?.business_name || fromNumber}`,
      body: text.slice(0, 140),
      link: repUser?.role === 'setter' ? '/setter/messages' : undefined,
      severity: 'info',
    })

    if (lead?.id) {
      await supabaseAdmin.from('lead_notes').insert({
        lead_id: lead.id,
        rep_id: repId,
        body: `SMS reply: ${text}`,
      }).then((r) => r, () => null)

      if (STOP_WORDS.test(text)) {
        // Opt-out: flip every assignment of this lead to do_not_call.
        await supabaseAdmin
          .from('lead_assignments')
          .update({ status: 'do_not_call', last_touched_at: new Date().toISOString() })
          .eq('lead_id', lead.id)
        logger.warn('SMS STOP received - lead flipped to do_not_call', {
          lead_id: lead.id, from: fromNumber,
        })
      }
    }
    return true
  } catch (e) {
    logger.error('rep inbound SMS handling failed', {
      error: e instanceof Error ? e.message : 'unknown',
    })
    // Err on "not handled" so the caller can keep routing; a rep DID
    // never matches a business number, so the fallthrough is harmless.
    return false
  }
}
