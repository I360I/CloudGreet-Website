import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { markPhoneOptedOut } from '@/lib/review-requests'
import { supabaseAdmin } from '@/lib/supabase'
import { handleInboundSms } from '@/lib/sms-agent'
import { handleRepInboundSms } from '@/lib/telnyx/rep-inbound-sms'
import { verifyTelynyxSignature } from '@/lib/webhook-verification'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// The SMS agent loop can take 30-50s on turns with multiple sequential
// tool calls (e.g. 4x send_dispatch_request each sending an SMS).
// Telnyx gives up waiting for the webhook after ~60s; respond fast
// (200 OK first) or stay under 60s to avoid dropped replies.
export const maxDuration = 60

/**
 * Telnyx inbound SMS webhook.
 *
 * Wired in the Telnyx messaging profile → "Inbound message webhook" →
 * https://cloudgreet.com/api/telnyx/sms-webhook
 *
 * Watches for opt-out keywords (STOP, UNSUBSCRIBE, END, QUIT, CANCEL,
 * STOPALL, REVOKE) and writes the sending phone to review_opt_outs so
 * we never message them again. Carrier-level STOP handling is also
 * done by Telnyx automatically (they reply with the standard opt-out
 * confirmation), but tracking it on our side lets us:
 *   - Cancel any queued review_requests for that number
 *   - Avoid re-scheduling future review SMS for the same customer
 *   - Show owners that their customer opted out (audit trail)
 *
 * No-op on anything that isn't an inbound message.received event with
 * an opt-out keyword. Telnyx requires a 200 within ~10s; we keep this
 * cheap.
 */

const OPT_OUT_KEYWORDS = new Set([
  'STOP', 'STOPALL', 'UNSUBSCRIBE', 'END', 'QUIT', 'CANCEL', 'REVOKE',
])

export async function POST(request: NextRequest) {
  try {
    // Read the raw body for signature verification BEFORE parsing. This
    // endpoint writes opt-outs (markPhoneOptedOut) and drives the paid AI
    // agent (handleInboundSms) straight from the request body, so an
    // unauthenticated caller could forge STOP for any customer or run up
    // Anthropic/Telnyx costs. Verify whenever we're in production OR a
    // Telnyx public key is configured (matches /api/sms/webhook), so a
    // missing NODE_ENV can't silently open the door.
    const rawBody = await request.text()
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')
    const shouldVerify =
      process.env.NODE_ENV === 'production' || !!process.env.TELNYX_PUBLIC_KEY
    if (shouldVerify && !verifyTelynyxSignature(rawBody, signature, timestamp)) {
      logger.warn('Telnyx inbound SMS webhook signature verification failed', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
      })
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 },
      )
    }

    let body: any = null
    try { body = JSON.parse(rawBody) } catch { body = null }
    if (!body) return NextResponse.json({ received: true })

    const event = body?.data?.event_type || body?.event_type || ''

    // Outbound delivery receipts for owner dispatch texts. message.finalized
    // carries the final per-recipient status; we retry/alert on failure so a
    // "Steve, call this customer back" text that doesn't land gets resent.
    if (event === 'message.finalized' || event === 'message.sent') {
      const dlr = body?.data?.payload || body?.payload || body
      const msgId: string | undefined = dlr?.id || body?.data?.id
      const toArr = dlr?.to
      const toStatus: string =
        Array.isArray(toArr) ? (toArr[0]?.status || '') : (toArr?.status || '')
      const errDetail =
        dlr?.errors?.[0]?.detail || dlr?.errors?.[0]?.title || dlr?.errors?.[0]?.code
      if (msgId && toStatus) {
        try {
          const { handleDispatchDlr } = await import('@/lib/dispatch-tracking')
          await handleDispatchDlr(String(msgId), String(toStatus), errDetail ? String(errDetail) : undefined)
        } catch (e) {
          logger.warn('dispatch DLR handling failed', { error: e instanceof Error ? e.message : 'unknown' })
        }
      }
      return NextResponse.json({ received: true })
    }

    if (event !== 'message.received') {
      return NextResponse.json({ received: true })
    }

    const payload = body?.data?.payload || body?.payload || body

    // Dedup: Telnyx retries the same webhook if our response is slow,
    // and our agent loop (Anthropic + Cal.com + send_sms) can take 15s+.
    // Race-safe via a PK insert - the SECOND identical webhook gets a
    // 23505 unique violation and bounces here, before either run can
    // start replying. Without this we ended up texting the customer
    // back twice per inbound message.
    const telnyxMessageId: string | undefined =
      payload?.id || payload?.message_id || body?.data?.id
    if (telnyxMessageId) {
      const { error: dedupErr } = await supabaseAdmin
        .from('processed_webhook_ids')
        .insert({ id: `telnyx_sms:${telnyxMessageId}`, source: 'telnyx_sms' })
      if (dedupErr) {
        if (dedupErr.code === '23505') {
          logger.info('sms webhook duplicate suppressed', { telnyxMessageId })
          return NextResponse.json({ received: true, dedup: true })
        }
        logger.warn('sms webhook dedup insert failed (continuing)', {
          telnyxMessageId, code: dedupErr.code, msg: dedupErr.message,
        })
      }
    }
    const fromNumber: string | undefined =
      payload?.from?.phone_number || payload?.from || undefined
    // Telnyx wraps `to` as an array of {phone_number, status}. The first
    // entry is the recipient that fired this webhook event.
    const toRaw = payload?.to
    const toNumber: string | undefined =
      typeof toRaw === 'string' ? toRaw
      : Array.isArray(toRaw) ? (toRaw[0]?.phone_number || toRaw[0])
      : (toRaw?.phone_number)
    const text: string =
      typeof payload?.text === 'string' ? payload.text :
      typeof payload?.body === 'string' ? payload.body : ''

    if (!fromNumber || !text) {
      return NextResponse.json({ received: true })
    }

    // Texts to a rep's dialer DID (replies to setter/sales follow-ups)
    // route to the rep thread flow - BEFORE the generic STOP block,
    // because a STOP to a rep DID must flip the LEAD to do_not_call
    // (handled inside), not just the review-request opt-out list.
    if (toNumber) {
      const repHandled = await handleRepInboundSms({
        fromNumber, toNumber, text,
        telnyxMessageId: telnyxMessageId || null,
      })
      if (repHandled) {
        return NextResponse.json({ received: true, routed: 'rep_sms' })
      }
    }

    // STOP / opt-out keyword - always processed first, regardless of
    // which business number received it. Keeps compliance reliable
    // even if the business-routing lookup misses.
    const firstWord = text.trim().toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(/\s+/)[0]
    if (firstWord && OPT_OUT_KEYWORDS.has(firstWord)) {
      try {
        await markPhoneOptedOut(fromNumber, 'stop_keyword')
        logger.info('opt-out registered', { phone: fromNumber, keyword: firstWord })
      } catch (e) {
        logger.warn('opt-out mark failed', {
          phone: fromNumber, error: e instanceof Error ? e.message : 'Unknown',
        })
      }
      // Telnyx auto-replies with the compliance confirmation. Don't
      // also fire the business agent for a STOP message.
      return NextResponse.json({ received: true })
    }

    // If the message hit a business's CloudGreet SMS number (sms_phone_number
    // when set, otherwise the same number their voice agent listens on),
    // route to the SMS agent so customers can text to get a quote / dispatch.
    if (toNumber) {
      // .or() with two equality predicates - Telnyx-owned SMS DIDs
      // typically differ from the Retell-managed voice DID, so we
      // check both columns.
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('id, sms_agent_enabled')
        .or(`sms_phone_number.eq.${toNumber},phone_number.eq.${toNumber}`)
        .limit(1)
        .maybeSingle()
      if ((biz as any)?.id) {
        const enabled = (biz as any).sms_agent_enabled !== false
        if (enabled) {
          // Await inline. Vercel serverless terminates pending work
          // the moment the response is sent, so fire-and-forget would
          // silently die on every call. Telnyx's webhook timeout is
          // ~30s, plenty of room for our ~15s tool-use loop.
          try {
            const result = await handleInboundSms({
              businessId: (biz as any).id,
              fromPhone: fromNumber,
              toPhone: toNumber,
              body: text,
            })
            return NextResponse.json({
              received: true,
              routed: 'sms_agent',
              result_ok: result.ok,
            })
          } catch (e) {
            logger.error('sms-agent: handleInboundSms threw', {
              businessId: (biz as any).id,
              error: e instanceof Error ? e.message : 'unknown',
            })
            // Still 200 so Telnyx doesn't retry-storm us.
            return NextResponse.json({ received: true, routed: 'sms_agent', error: true })
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    logger.error('telnyx sms webhook threw', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    // Always 200 to Telnyx so they don't retry-storm us
    return NextResponse.json({ received: true })
  }
}
