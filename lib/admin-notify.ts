/**
 * Fans out a copy of owner-facing operational SMS to the platform admin
 * phone (CLOUDGREET_ADMIN_NOTIFY_PHONE). Used to mirror booking + dispatch
 * notifications across all clients so the admin sees the whole pipeline
 * without logging into each client's dashboard.
 *
 * Best-effort: a failure here NEVER blocks the primary owner SMS. We log
 * and move on.
 */

import { telnyxClient } from './telnyx'
import { logger } from './monitoring'

const ADMIN_PHONE_FALLBACK = '+17372960092'
const PREFIX = 'CG admin'

export async function sendAdminCopy(args: {
  clientName: string
  kind: 'booking' | 'dispatch' | 'cancel' | 'reschedule'
  body: string
}): Promise<void> {
  const adminPhone = (process.env.CLOUDGREET_ADMIN_NOTIFY_PHONE || ADMIN_PHONE_FALLBACK).trim()
  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!adminPhone || !fromNumber) return

  // Don't echo to admin when the admin IS the business owner (e.g., when
  // testing against a client whose notifications_phone is the same as the
  // admin's). Otherwise the admin gets two identical texts.
  // The check happens at the call site by passing in ownerPhone - here
  // we just guard against the env var being literally the from number.
  if (adminPhone === fromNumber) return

  const label = (args.clientName || 'client').trim()
  const body = `[${label}] ${args.kind}: ${args.body}`.slice(0, 1500)

  try {
    await telnyxClient.sendSMS(adminPhone, body, fromNumber)
  } catch (e) {
    logger.warn('admin-notify: send failed', {
      kind: args.kind,
      client: label,
      error: e instanceof Error ? e.message : 'unknown',
    })
  }
}

/**
 * Convenience: same as sendAdminCopy but skips when the owner phone is
 * the admin phone (saves them the duplicate SMS when they're testing
 * against their own number).
 */
export async function sendAdminCopyIfDistinct(args: {
  clientName: string
  ownerPhone: string | null | undefined
  kind: 'booking' | 'dispatch' | 'cancel' | 'reschedule'
  body: string
}): Promise<void> {
  const adminPhone = (process.env.CLOUDGREET_ADMIN_NOTIFY_PHONE || ADMIN_PHONE_FALLBACK).trim()
  if (args.ownerPhone && args.ownerPhone.replace(/\D/g, '') === adminPhone.replace(/\D/g, '')) return
  return sendAdminCopy({ clientName: args.clientName, kind: args.kind, body: args.body })
}
