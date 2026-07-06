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
export type PhoneNumberLookupDiagnostic = {
  ok: boolean
  http_status: number | null
  match_count: number
  matched_id: string | null
  /** Every phone_number the filtered response actually returned - if this
   *  ever contains numbers OTHER than the one searched for, the filter
   *  param isn't matching and Telnyx is returning an unfiltered/wrong list. */
  returned_numbers: string[]
  raw_error: string | null
}

/**
 * Raw, no-fallback lookup used for diagnosing filter behavior. Never
 * guesses - if the filtered response contains any number other than
 * the one requested, or zero results, that's surfaced explicitly
 * instead of silently taking the first item.
 */
export async function debugLookupPhoneNumber(phoneNumber: string): Promise<PhoneNumberLookupDiagnostic> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return { ok: false, http_status: null, match_count: 0, matched_id: null, returned_numbers: [], raw_error: 'Missing TELNYX_API_KEY' }
  try {
    const params = new URLSearchParams()
    params.set('filter[phone_number]', phoneNumber)
    const r = await fetch(`https://api.telnyx.com/v2/phone_numbers?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const text = await r.text().catch(() => '')
    let j: any = null
    try { j = JSON.parse(text) } catch { /* leave null */ }
    if (!r.ok) {
      return { ok: false, http_status: r.status, match_count: 0, matched_id: null, returned_numbers: [], raw_error: text.slice(0, 300) }
    }
    const items = Array.isArray(j?.data) ? j.data : []
    const exact = items.find((d: any) => d.phone_number === phoneNumber)
    return {
      ok: true,
      http_status: r.status,
      match_count: items.length,
      matched_id: exact?.id || null,
      returned_numbers: items.map((d: any) => d.phone_number).filter(Boolean),
      raw_error: null,
    }
  } catch (e) {
    return { ok: false, http_status: null, match_count: 0, matched_id: null, returned_numbers: [], raw_error: e instanceof Error ? e.message : 'Network error' }
  }
}

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
    const items = Array.isArray(j?.data) ? j.data : []
    // Exact-match only - never trust data[0] blindly. If the filter
    // param doesn't do what we think, Telnyx could return an
    // unfiltered list and data[0] would be an arbitrary WRONG number.
    const exact = items.find((d: any) => d.phone_number === phoneNumber)
    if (!exact?.id) {
      return {
        ok: false,
        error: `No exact Telnyx phone_numbers match for ${phoneNumber} (filter returned ${items.length} result(s): ${items.map((d: any) => d.phone_number).join(', ') || 'none'})`,
      }
    }
    return { ok: true, id: exact.id }
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
