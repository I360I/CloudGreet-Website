import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { markPhoneOptedOut } from '@/lib/review-requests'

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
    const text: string =
      typeof payload?.text === 'string' ? payload.text :
      typeof payload?.body === 'string' ? payload.body : ''

    if (!fromNumber || !text) {
      return NextResponse.json({ received: true })
    }

    // Normalize: trim, uppercase, strip punctuation, take first word.
    const firstWord = text.trim().toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(/\s+/)[0]
    if (!firstWord) return NextResponse.json({ received: true })

    if (OPT_OUT_KEYWORDS.has(firstWord)) {
      try {
        await markPhoneOptedOut(fromNumber, 'stop_keyword')
        logger.info('opt-out registered', { phone: fromNumber, keyword: firstWord })
      } catch (e) {
        logger.warn('opt-out mark failed', {
          phone: fromNumber,
          error: e instanceof Error ? e.message : 'Unknown',
        })
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
