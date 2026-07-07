import { telnyxClient } from '@/lib/telnyx'
import { logger } from '@/lib/monitoring'

/*
 * Owner SMS alerts for setter activity - a text to CLOUDGREET_ADMIN_
 * NOTIFY_PHONE (Anthony) whenever a setter sends a booking link or marks
 * a demo. Best-effort and fire-and-forget: never block the request that
 * triggered it, never throw.
 */
export async function textOwnerSetterActivity(lines: string[]): Promise<void> {
  try {
    const from = process.env.CLOUDGREET_NOTIFICATIONS_FROM
    const to = (process.env.CLOUDGREET_ADMIN_NOTIFY_PHONE || '+17372960092').trim()
    if (!from || !to) {
      logger.warn('textOwnerSetterActivity: missing from/to number')
      return
    }
    const body = lines.filter(Boolean).join('\n').slice(0, 500)
    await telnyxClient.sendSMS(to, body, from)
  } catch (e) {
    logger.warn('textOwnerSetterActivity failed', { error: e instanceof Error ? e.message : 'unknown' })
  }
}
