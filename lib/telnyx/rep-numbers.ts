/**
 * Per-rep multi-number management.
 *
 * Backs the dialer's "from" picker. Reps keep up to 3 saved DIDs;
 * adding a 4th evicts the oldest non-active one and releases it from
 * Telnyx so we stop paying for it (~$1/mo each).
 *
 * State lives on:
 *   sales_rep_phone_numbers   - one row per saved number
 *   sales_reps.telnyx_*       - legacy single-number fields, kept in
 *                               sync with whichever number is active
 *                               so the dialer-token route + admin
 *                               provision-number page keep working
 *                               unchanged.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { attachToMessagingProfile, resolvePhoneNumberId } from '@/lib/telnyx/messaging-profile'

const MAX_NUMBERS_PER_REP = 3

export type RepPhoneNumber = {
  id: string
  rep_id: string
  phone_number: string
  phone_id: string
  label: string | null
  is_active: boolean
  created_at: string
}

export type OrderResult =
  | { ok: true; created: RepPhoneNumber; evicted: RepPhoneNumber | null }
  | { ok: false; error: string }

const TELNYX_API = 'https://api.telnyx.com/v2'

function telnyxAuth() {
  const apiKey = process.env.TELNYX_API_KEY
  const connectionId = process.env.TELNYX_SIP_CONNECTION_ID
  if (!apiKey || !connectionId) return null
  return {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    connectionId,
  }
}

/**
 * List a rep's saved DIDs (newest first). Lazy-backfills the rep's
 * legacy single-number row into this table on first read so the
 * picker UI works for everyone without a separate migration job.
 */
export async function listRepNumbers(repId: string): Promise<RepPhoneNumber[]> {
  const { data } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('*')
    .eq('rep_id', repId)
    .order('created_at', { ascending: false })
  if (data && data.length > 0) return data as RepPhoneNumber[]

  // Backfill: if the rep has a legacy number on sales_reps but no rows
  // here, materialize it as the active row.
  const { data: legacy } = await supabaseAdmin
    .from('sales_reps')
    .select('telnyx_outbound_number, telnyx_phone_id')
    .eq('id', repId)
    .maybeSingle()
  const num = legacy?.telnyx_outbound_number
  const id = legacy?.telnyx_phone_id
  if (!num || !id) return []
  const { data: inserted } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .insert({
      rep_id: repId,
      phone_number: num,
      phone_id: id,
      label: null,
      is_active: true,
    })
    .select('*')
    .single()
  return inserted ? [inserted as RepPhoneNumber] : []
}

/**
 * Order a new DID for the rep. If they're at the cap (3), evict the
 * oldest non-active one - releasing it from Telnyx so we stop paying.
 *
 * If the rep currently has zero numbers, the new one is also marked
 * active so the dialer has a from-number to work with.
 */
export async function orderRepNumber(
  repId: string,
  opts?: { areaCode?: string; label?: string },
): Promise<OrderResult> {
  const tx = telnyxAuth()
  if (!tx) return { ok: false, error: 'Missing TELNYX_API_KEY or TELNYX_SIP_CONNECTION_ID' }

  // 1. Search for an available local US DID (preferred area code first,
  //    then any).
  const search = async (areaCode?: string): Promise<string | null> => {
    const params = new URLSearchParams()
    params.set('filter[country_code]', 'US')
    params.set('filter[features][]', 'voice')
    params.set('filter[phone_number_type]', 'local')
    params.set('filter[limit]', '1')
    if (areaCode) params.set('filter[national_destination_code]', areaCode)
    const r = await fetch(`${TELNYX_API}/available_phone_numbers?${params}`, { headers: tx.headers })
    if (!r.ok) return null
    const j = await r.json().catch(() => null) as any
    const num = j?.data?.[0]?.phone_number
    return typeof num === 'string' ? num : null
  }

  let phoneNumber = await search(opts?.areaCode)
  if (!phoneNumber && opts?.areaCode) phoneNumber = await search()
  if (!phoneNumber) return { ok: false, error: 'No available US local DIDs returned by Telnyx' }

  // 2. Order it.
  const orderRes = await fetch(`${TELNYX_API}/number_orders`, {
    method: 'POST',
    headers: tx.headers,
    body: JSON.stringify({
      phone_numbers: [{ phone_number: phoneNumber }],
      connection_id: tx.connectionId,
    }),
  })
  const orderText = await orderRes.text()
  let order: any = null
  try { order = JSON.parse(orderText) } catch { /* keep null */ }

  if (!orderRes.ok) {
    const detail = order?.errors?.[0]?.detail || orderText.slice(0, 300)
    logger.error('telnyx number order failed', { status: orderRes.status, detail })
    return { ok: false, error: `Telnyx order failed (${orderRes.status}): ${detail}` }
  }

  // The id inside a number order's response is an ORDER resource, not
  // the /v2/phone_numbers/{id} the number itself uses - stored only as
  // a last-resort fallback if the real lookup below fails.
  const orderPhoneId =
    order?.data?.phone_numbers?.[0]?.id ||
    order?.data?.id ||
    phoneNumber

  // Attach to the account's Messaging Profile so this DID inherits the
  // 10DLC campaign - without it, SMS from this number gets silently
  // carrier-filtered while calls still work. This also resolves the
  // number's REAL Telnyx resource id (see resolvePhoneNumberId), which
  // is what gets persisted below so release/eviction later actually
  // works instead of 404ing against the wrong id. Best-effort; a
  // failure shouldn't block handing the rep a working number for calls.
  const attach = await attachToMessagingProfile(phoneNumber)
  if (attach.ok !== true) {
    logger.warn('orderRepNumber: messaging profile attach failed', { repId, phoneNumber, error: attach.error })
  }
  const phoneId = attach.ok ? attach.resolved_id : orderPhoneId

  // 3. Eviction: if at cap, drop the oldest non-active row + release
  //    from Telnyx so we stop being billed.
  let evicted: RepPhoneNumber | null = null
  const existing = await listRepNumbers(repId)
  if (existing.length >= MAX_NUMBERS_PER_REP) {
    const oldestNonActive = [...existing]
      .filter((n) => !n.is_active)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
    if (oldestNonActive) {
      const released = await releaseTelnyxNumber(oldestNonActive.phone_number)
      if (released.ok !== true) {
        logger.warn('eviction release failed - keeping row to retry', {
          repId, evict_id: oldestNonActive.id, error: released.error,
        })
      } else {
        await supabaseAdmin
          .from('sales_rep_phone_numbers')
          .delete()
          .eq('id', oldestNonActive.id)
        evicted = oldestNonActive
      }
    }
    // If every saved number is the active one (edge case: only one row
    // and it's active), refuse - the rep should manually pick a different
    // active first.
    if (!evicted && existing.length >= MAX_NUMBERS_PER_REP) {
      // Rollback: release the just-ordered number so we don't pay for
      // a phantom one.
      await releaseTelnyxNumber(phoneNumber)
      return {
        ok: false,
        error: 'Cap of 3 numbers reached and the only candidates for eviction are the active one. Switch active first, then add new.',
      }
    }
  }

  // 4. Insert the new row. First-ever number is auto-active.
  const isFirst = existing.length === 0
  const { data: inserted, error: dbErr } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .insert({
      rep_id: repId,
      phone_number: phoneNumber,
      phone_id: phoneId,
      label: opts?.label || null,
      is_active: isFirst,
    })
    .select('*')
    .single()
  if (dbErr || !inserted) {
    // Best-effort release so we don't pay for a number we can't track.
    await releaseTelnyxNumber(phoneNumber)
    return { ok: false, error: `DB insert failed: ${dbErr?.message || 'unknown'}` }
  }

  if (isFirst) await syncLegacyActive(repId)

  logger.info('rep number ordered', { repId, phoneNumber, evicted: evicted?.phone_number })
  return { ok: true, created: inserted as RepPhoneNumber, evicted }
}

/**
 * Switch which saved number the rep dials out from. Updates
 * sales_rep_phone_numbers.is_active and mirrors to the legacy
 * sales_reps.telnyx_outbound_number / telnyx_phone_id pair so the
 * dialer-token route keeps working without a code change.
 */
export async function setActiveRepNumber(
  repId: string,
  numberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Verify the row belongs to this rep.
  const { data: row } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('id, rep_id, phone_number, phone_id')
    .eq('id', numberId)
    .maybeSingle()
  if (!row || row.rep_id !== repId) return { ok: false, error: 'Number not found' }

  // Two-step swap inside one transaction-ish flow. Clear current
  // active first to satisfy the unique partial index, then set new.
  const clear = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .update({ is_active: false })
    .eq('rep_id', repId)
    .eq('is_active', true)
  if (clear.error) return { ok: false, error: clear.error.message }

  const setNew = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .update({ is_active: true })
    .eq('id', numberId)
  if (setNew.error) return { ok: false, error: setNew.error.message }

  await syncLegacyActive(repId)
  return { ok: true }
}

/**
 * Manually drop a saved number. Releases at Telnyx then deletes the
 * row. Refuses to release the active one (rep must switch first) so
 * we don't end up with no callable from-number.
 */
export async function deleteRepNumber(
  repId: string,
  numberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('id, rep_id, phone_number, is_active')
    .eq('id', numberId)
    .maybeSingle()
  if (!row || row.rep_id !== repId) return { ok: false, error: 'Number not found' }
  if (row.is_active) {
    return { ok: false, error: 'Switch active to a different number before deleting this one.' }
  }

  const released = await releaseTelnyxNumber(row.phone_number)
  if (released.ok !== true) return { ok: false, error: released.error }

  const { error } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .delete()
    .eq('id', numberId)
  if (error) return { ok: false, error: error.message }

  return { ok: true }
}

/**
 * DELETE /v2/phone_numbers/{id} releases the number on Telnyx and
 * stops the recurring monthly charge.
 *
 * Takes the E.164 phone NUMBER and resolves the real resource id
 * itself - the id stored on older rows was the number-order's id, a
 * different resource that always 404s against /v2/phone_numbers/{id}.
 * With that bug, this function's old "404 = already gone, treat as
 * ok" fallback was silently swallowing every failed release: evicted/
 * deleted numbers were removed from our DB but likely NEVER actually
 * released at Telnyx, and may still be billing monthly. Resolving the
 * real id first means a 404 here now genuinely means gone.
 *
 * 200 / 204 → ok; 404 (after a successful resolve) → already gone.
 */
async function releaseTelnyxNumber(phoneNumber: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const tx = telnyxAuth()
  if (!tx) return { ok: false, error: 'Missing TELNYX_API_KEY' }
  const resolved = await resolvePhoneNumberId(phoneNumber)
  if (resolved.ok !== true) {
    // No matching Telnyx resource at all - already released.
    if (resolved.error.includes('No Telnyx phone_numbers resource found')) return { ok: true }
    return { ok: false, error: resolved.error }
  }
  try {
    const r = await fetch(`${TELNYX_API}/phone_numbers/${encodeURIComponent(resolved.id)}`, {
      method: 'DELETE',
      headers: tx.headers,
    })
    if (r.ok || r.status === 404) return { ok: true }
    const body = await r.text().catch(() => '')
    logger.error('telnyx number release failed', { status: r.status, body: body.slice(0, 200) })
    return { ok: false, error: `Telnyx release failed (${r.status})` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error releasing number' }
  }
}

/**
 * Mirror the active number into the legacy single-number fields on
 * sales_reps so /api/sales/dialer/token (and admin views) keep
 * working without changes.
 */
async function syncLegacyActive(repId: string): Promise<void> {
  const { data: active } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('phone_number, phone_id')
    .eq('rep_id', repId)
    .eq('is_active', true)
    .maybeSingle()
  await supabaseAdmin
    .from('sales_reps')
    .update({
      telnyx_outbound_number: active?.phone_number || null,
      telnyx_phone_id: active?.phone_id || null,
    })
    .eq('id', repId)
}
