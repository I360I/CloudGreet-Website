import { NextRequest, NextResponse } from 'next/server'
import { handleRepInboundSms } from '@/lib/telnyx/rep-inbound-sms'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * POST /api/telnyx/rep-sms-webhook
 *
 * Standalone endpoint for inbound SMS to a rep's DID. NOTE: the live
 * Telnyx Messaging Profile points its inbound webhook at
 * /api/telnyx/sms-webhook, which routes rep-DID texts to the same
 * shared handler (lib/telnyx/rep-inbound-sms) - so in production this
 * route is a spare, kept for a dedicated rep messaging profile if one
 * is ever split out. All behavior (rep_messages logging, bell
 * notification, lead note, STOP -> do_not_call) lives in the shared
 * handler so the two entry points can't drift.
 */
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

  await handleRepInboundSms({ fromNumber, toNumber, text, telnyxMessageId: telnyxId || null })
  // Always 200 - Telnyx retries on non-2xx and this isn't retryable.
  return NextResponse.json({ received: true })
}
