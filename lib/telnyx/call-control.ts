import { logger } from '@/lib/monitoring'

const TELNYX_BASE = 'https://api.telnyx.com/v2'

/**
 * Fire a Telnyx Call Control action (speak, hangup, record_start, ...)
 * against a live call leg. Shared by the rep-voice webhook (inbound
 * voicemail) and the dialer's manual voicemail-drop route so both use
 * the exact same request shape.
 */
export async function telnyxAction(
  callControlId: string,
  action: string,
  body: Record<string, unknown> = {},
) {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return
  try {
    const res = await fetch(`${TELNYX_BASE}/calls/${callControlId}/actions/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      logger.warn(`telnyx action ${action} failed`, { callControlId, status: res.status, body: t.slice(0, 200) })
    }
  } catch (e) {
    logger.warn(`telnyx action ${action} threw`, { callControlId, error: e instanceof Error ? e.message : 'unknown' })
  }
}
