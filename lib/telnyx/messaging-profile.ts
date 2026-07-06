import { logger } from '@/lib/monitoring'

/**
 * Attach a Telnyx phone number to the account's Messaging Profile.
 *
 * 10DLC campaign registration in Telnyx is assigned to a Messaging
 * Profile, not to individual numbers - any number attached to a
 * profile that has an approved campaign inherits that registration
 * automatically (Telnyx handles the number->campaign submission).
 * Numbers ordered via /v2/number_orders do NOT get a messaging profile
 * by default, so every previously-provisioned rep DID was sending
 * outbound SMS unregistered - carriers filter those silently even
 * though Telnyx itself accepts and "sends" them (confirmed live:
 * status 'sent' followed by a delivery_failed DLR citing exactly this).
 *
 * Idempotent - safe to call on a number that's already attached.
 * Propagation to carriers after attaching is typically minutes, not
 * hours, for a number joining an already-approved campaign.
 */
export async function attachToMessagingProfile(
  phoneId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.TELNYX_API_KEY
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID
  if (!apiKey) return { ok: false, error: 'Missing TELNYX_API_KEY' }
  if (!profileId) return { ok: false, error: 'Missing TELNYX_MESSAGING_PROFILE_ID' }

  try {
    const r = await fetch(`https://api.telnyx.com/v2/phone_numbers/${encodeURIComponent(phoneId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_profile_id: profileId }),
    })
    if (r.ok) return { ok: true }
    const body = await r.text().catch(() => '')
    const error = `Telnyx messaging profile attach failed (${r.status}): ${body.slice(0, 300)}`
    logger.error('attachToMessagingProfile failed', { phoneId, status: r.status, body: body.slice(0, 300) })
    return { ok: false, error }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Network error'
    logger.error('attachToMessagingProfile threw', { phoneId, error })
    return { ok: false, error }
  }
}
