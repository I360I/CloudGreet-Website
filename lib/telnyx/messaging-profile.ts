import { logger } from '@/lib/monitoring'

/**
 * Resolve a Telnyx phone NUMBER (E.164) to its real /v2/phone_numbers
 * resource ID.
 *
 * Root cause discovered live: every rep DID's stored "phone_id" 404'd
 * when PATCHed. The ID Telnyx returns inside a number order's response
 * (`data.phone_numbers[].id`, or the fallback `data.id`) is the ORDER
 * (or order line item), a DIFFERENT resource type - not the ID that
 * /v2/phone_numbers/{id} PATCH/DELETE/GET expects. The only reliable
 * way to get the real per-number resource ID is to look it up by the
 * E.164 number itself.
 */
export async function resolvePhoneNumberId(
  phoneNumber: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return { ok: false, error: 'Missing TELNYX_API_KEY' }
  try {
    const params = new URLSearchParams()
    params.set('filter[phone_number]', phoneNumber)
    const r = await fetch(`https://api.telnyx.com/v2/phone_numbers?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return { ok: false, error: `Telnyx phone number lookup failed (${r.status}): ${body.slice(0, 300)}` }
    }
    const j = await r.json().catch(() => null) as any
    const id = j?.data?.[0]?.id
    if (!id) return { ok: false, error: `No Telnyx phone_numbers resource found for ${phoneNumber}` }
    return { ok: true, id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

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
 * Takes the E.164 number (not a possibly-wrong stored id) and resolves
 * the real resource id itself. Idempotent - safe to call on a number
 * that's already attached. Propagation to carriers after attaching is
 * typically minutes, not hours, for a number joining an
 * already-approved campaign.
 */
export async function attachToMessagingProfile(
  phoneNumber: string,
): Promise<{ ok: true; resolved_id: string } | { ok: false; error: string }> {
  const apiKey = process.env.TELNYX_API_KEY
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID
  if (!apiKey) return { ok: false, error: 'Missing TELNYX_API_KEY' }
  if (!profileId) return { ok: false, error: 'Missing TELNYX_MESSAGING_PROFILE_ID' }

  const resolved = await resolvePhoneNumberId(phoneNumber)
  if (resolved.ok !== true) return { ok: false, error: resolved.error }

  try {
    const r = await fetch(`https://api.telnyx.com/v2/phone_numbers/${encodeURIComponent(resolved.id)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_profile_id: profileId }),
    })
    if (r.ok) return { ok: true, resolved_id: resolved.id }
    const body = await r.text().catch(() => '')
    const error = `Telnyx messaging profile attach failed (${r.status}): ${body.slice(0, 300)}`
    logger.error('attachToMessagingProfile failed', { phoneNumber, status: r.status, body: body.slice(0, 300) })
    return { ok: false, error }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Network error'
    logger.error('attachToMessagingProfile threw', { phoneNumber, error })
    return { ok: false, error }
  }
}
