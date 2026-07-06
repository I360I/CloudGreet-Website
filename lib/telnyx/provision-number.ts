import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { attachToMessagingProfile } from '@/lib/telnyx/messaging-profile'

/**
 * Provision a Telnyx local DID for a sales rep, attach it to the
 * shared SIP connection, and persist the result on their sales_reps
 * row. Idempotent: if the rep already has a number assigned this is a
 * no-op success.
 *
 * Runs against the Telnyx REST API directly. Two HTTP calls:
 *   1. GET  /v2/available_phone_numbers   - search for a free local DID
 *   2. POST /v2/number_orders             - buy it + bind to connection
 *
 * US local DIDs at Telnyx are ~$1/mo. Order completes synchronously
 * for available local numbers (no fulfillment wait).
 *
 * Required env:
 *   TELNYX_API_KEY                  - same key used elsewhere
 *   TELNYX_SIP_CONNECTION_ID        - the SIP Connection that the
 *                                     Telephony Credentials hang off.
 *                                     New numbers are bound to this so
 *                                     any rep credential can use any
 *                                     number on the connection as
 *                                     caller ID.
 *
 * Failure modes are recorded on the rep row (telnyx_provision_error)
 * rather than thrown - we never want number provisioning to break the
 * accept-invite flow. Admin can manually retry from the rep page.
 */

export type ProvisionResult =
  | { ok: true; phone_number: string; phone_id: string; reused?: boolean }
  | { ok: false; error: string }

export async function provisionRepNumber(
  repId: string,
  opts?: { areaCode?: string; force?: boolean },
): Promise<ProvisionResult> {
  const apiKey = process.env.TELNYX_API_KEY
  const connectionId = process.env.TELNYX_SIP_CONNECTION_ID
  if (!apiKey || !connectionId) {
    return { ok: false, error: 'Missing TELNYX_API_KEY or TELNYX_SIP_CONNECTION_ID' }
  }

  // Already-provisioned reps are a no-op unless the caller forces a
  // re-provision. This matters when accept-invite runs twice (rare,
  // happens if the user double-clicks the email link) or when admin
  // manually triggers from the rep page.
  if (!opts?.force) {
    const { data: existing } = await supabaseAdmin
      .from('sales_reps')
      .select('telnyx_outbound_number, telnyx_phone_id')
      .eq('id', repId)
      .maybeSingle()
    if (existing?.telnyx_outbound_number && existing?.telnyx_phone_id) {
      return {
        ok: true,
        phone_number: existing.telnyx_outbound_number,
        phone_id: existing.telnyx_phone_id,
        reused: true,
      }
    }
  }

  const auth = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  // 1. Search for a free local US DID. We try the requested area code
  //    first, then fall back to any US local number if that's empty
  //    (some area codes have zero inventory at any moment).
  const search = async (areaCode?: string): Promise<string | null> => {
    const params = new URLSearchParams()
    params.set('filter[country_code]', 'US')
    params.set('filter[features][]', 'voice')
    params.set('filter[phone_number_type]', 'local')
    params.set('filter[limit]', '1')
    if (areaCode) params.set('filter[national_destination_code]', areaCode)
    const r = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params}`, {
      headers: auth,
    })
    if (!r.ok) return null
    const j = await r.json().catch(() => null) as any
    const num = j?.data?.[0]?.phone_number
    return typeof num === 'string' ? num : null
  }

  let phoneNumber = await search(opts?.areaCode)
  if (!phoneNumber && opts?.areaCode) phoneNumber = await search()
  if (!phoneNumber) {
    const error = 'No available US local DIDs returned by Telnyx'
    await supabaseAdmin.from('sales_reps')
      .update({ telnyx_provision_error: error, telnyx_provisioned_at: new Date().toISOString() })
      .eq('id', repId)
    return { ok: false, error }
  }

  // 2. Order it. connection_id binds the new number to our SIP
  //    connection so the rep's Telephony Credential can use it.
  const orderRes = await fetch('https://api.telnyx.com/v2/number_orders', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      phone_numbers: [{ phone_number: phoneNumber }],
      connection_id: connectionId,
    }),
  })
  const orderText = await orderRes.text()
  let order: any = null
  try { order = JSON.parse(orderText) } catch { /* keep null */ }

  if (!orderRes.ok) {
    const detail = order?.errors?.[0]?.detail || orderText.slice(0, 300)
    logger.error('telnyx number order failed', { status: orderRes.status, detail })
    const error = `Order failed (${orderRes.status}): ${detail}`
    await supabaseAdmin.from('sales_reps')
      .update({ telnyx_provision_error: error, telnyx_provisioned_at: new Date().toISOString() })
      .eq('id', repId)
    return { ok: false, error }
  }

  // The order response's data.phone_numbers[0].id / data.id is an
  // ORDER resource, not the /v2/phone_numbers/{id} the number itself
  // uses - kept only as a last-resort fallback if the real lookup
  // below fails.
  const orderPhoneId =
    order?.data?.phone_numbers?.[0]?.id ||
    order?.data?.id ||
    phoneNumber

  // Attach to the account's Messaging Profile so the number inherits
  // 10DLC campaign registration - without this, SMS from it gets
  // silently carrier-filtered while calls work fine. This also
  // resolves the number's REAL Telnyx resource id, which is what gets
  // persisted below. Best-effort: a failure here shouldn't block
  // handing the rep a working number for calls; it just needs a retry
  // (admin backfill endpoint covers that).
  const attach = await attachToMessagingProfile(phoneNumber)
  if (attach.ok !== true) {
    logger.warn('provisionRepNumber: messaging profile attach failed', { repId, phoneNumber, error: attach.error })
  }
  const phoneId = attach.ok ? attach.resolved_id : orderPhoneId

  const { error: dbErr } = await supabaseAdmin
    .from('sales_reps')
    .update({
      telnyx_outbound_number: phoneNumber,
      telnyx_phone_id: phoneId,
      telnyx_provisioned_at: new Date().toISOString(),
      telnyx_provision_error: null,
    })
    .eq('id', repId)
  if (dbErr) {
    logger.error('telnyx provision: db update failed', { repId, error: dbErr.message })
    return { ok: false, error: `Number ordered but DB update failed: ${dbErr.message}` }
  }

  logger.info('telnyx number provisioned', { repId, phoneNumber })
  return { ok: true, phone_number: phoneNumber, phone_id: phoneId }
}
