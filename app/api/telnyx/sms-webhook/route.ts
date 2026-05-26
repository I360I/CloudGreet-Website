import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { markPhoneOptedOut } from '@/lib/review-requests'
import { supabaseAdmin } from '@/lib/supabase'
import { handleInboundSms } from '@/lib/sms-agent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    const body = await request.json().catch(() => null) as any
    if (!body) return NextResponse.json({ received: true })

    const event = body?.data?.event_type || body?.event_type || ''
    if (event !== 'message.received') {
      return NextResponse.json({ received: true })
    }

    const payload = body?.data?.payload || body?.payload || body
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
        // Default: SMS agent ON for any business with dispatch_mode
        // already enabled, OR explicitly enabled via the column.
        // The column is checked below for non-dispatch businesses.
        const enabled = (biz as any).sms_agent_enabled !== false
        if (enabled) {
          // Fire and forget - return 200 to Telnyx immediately to stay
          // well under their ~10s timeout while the agent runs. Errors
          // from the agent are logged but don't 5xx upstream.
          handleInboundSms({
            businessId: (biz as any).id,
            fromPhone: fromNumber,
            toPhone: toNumber,
            body: text,
          }).catch((e) => {
            logger.error('sms-agent: handleInboundSms threw', {
              businessId: (biz as any).id,
              error: e instanceof Error ? e.message : 'unknown',
            })
          })
          return NextResponse.json({ received: true, routed: 'sms_agent' })
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
