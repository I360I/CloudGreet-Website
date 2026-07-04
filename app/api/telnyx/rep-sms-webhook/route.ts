import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * POST /api/telnyx/rep-sms-webhook
 *
 * Inbound SMS to a rep's DID (replies to dialer follow-up texts).
 * Point the Telnyx Messaging Profile's webhook here.
 *
 *  - Logs the reply in rep_messages (matched to the rep who owns the
 *    receiving number, and to the lead by the sender's phone).
 *  - Mirrors it into the lead's note thread.
 *  - COMPLIANCE (non-negotiable): STOP/UNSUBSCRIBE/etc. replies flip
 *    the lead assignment to do_not_call immediately.
 */

const STOP_WORDS = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|remove)\b/i

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as any
  const eventType: string = payload?.data?.event_type || ''
  // Only inbound messages matter here; delivery receipts etc. are acked.
  if (eventType !== 'message.received') {
    return NextResponse.json({ received: true })
  }

  const msg = payload?.data?.payload || {}
  const fromNumber: string = msg?.from?.phone_number || ''
  const toNumber: string = Array.isArray(msg?.to) ? (msg.to[0]?.phone_number || '') : (msg?.to?.phone_number || '')
  const text: string = msg?.text || ''
  const telnyxId: string = msg?.id || ''
  if (!fromNumber || !toNumber) return NextResponse.json({ received: true })

  try {
    // Which rep owns the DID that received this?
    const { data: numRow } = await supabaseAdmin
      .from('sales_rep_phone_numbers')
      .select('rep_id')
      .eq('phone_number', toNumber)
      .maybeSingle()
    const repId: string | null = numRow?.rep_id || null

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
      telnyx_message_id: telnyxId,
      status: 'received',
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
  } catch (e) {
    logger.error('rep-sms-webhook failed', { error: e instanceof Error ? e.message : 'unknown' })
    // Still 200 - Telnyx retries on non-2xx and this isn't retryable.
  }

  return NextResponse.json({ received: true })
}
