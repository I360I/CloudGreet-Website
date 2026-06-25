import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/webhooks/telnyx-bridge
 *
 * Receives Telnyx Call Control events for bridge calls initiated by
 * /api/sales/dialer/bridge. When the rep answers their forwarding
 * number (Google Voice etc.), this endpoint fires the transfer that
 * connects them to the lead.
 *
 * client_state (base64 JSON) carries:
 *   { leadNumber: string, fromNumber: string }
 */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const event = body?.data
  const eventType: string = event?.event_type || ''
  const payload = event?.payload || {}
  const callControlId: string = payload.call_control_id || ''

  logger.info('telnyx-bridge webhook', { eventType, callControlId })

  if (eventType === 'call.answered') {
    const rawState: string = payload.client_state || ''
    if (!rawState) {
      logger.warn('telnyx-bridge: answered with no client_state', { callControlId })
      return NextResponse.json({ ok: true })
    }

    let leadNumber = ''
    let fromNumber = ''
    try {
      const decoded = JSON.parse(Buffer.from(rawState, 'base64').toString('utf8'))
      leadNumber = decoded.leadNumber || ''
      fromNumber = decoded.fromNumber || ''
    } catch {
      logger.warn('telnyx-bridge: failed to decode client_state', { rawState })
      return NextResponse.json({ ok: true })
    }

    if (!leadNumber) {
      logger.warn('telnyx-bridge: no leadNumber in client_state', { callControlId })
      return NextResponse.json({ ok: true })
    }

    const apiKey = process.env.TELNYX_API_KEY
    if (!apiKey) {
      logger.error('telnyx-bridge: TELNYX_API_KEY not set')
      return NextResponse.json({ ok: true })
    }

    try {
      const transferRes = await fetch(
        `https://api.telnyx.com/v2/calls/${encodeURIComponent(callControlId)}/actions/transfer`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: leadNumber,
            from: fromNumber,
          }),
        },
      )
      if (!transferRes.ok) {
        const errText = await transferRes.text().catch(() => '')
        logger.error('telnyx-bridge: transfer failed', {
          status: transferRes.status,
          body: errText.slice(0, 300),
          callControlId,
          leadNumber,
        })
      } else {
        logger.info('telnyx-bridge: transfer issued', { callControlId, leadNumber })
      }
    } catch (err) {
      logger.error('telnyx-bridge: transfer threw', {
        error: err instanceof Error ? err.message : String(err),
        callControlId,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
