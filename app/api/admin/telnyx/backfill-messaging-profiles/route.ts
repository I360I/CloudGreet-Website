import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { attachToMessagingProfile, resolvePhoneNumberId, debugLookupPhoneNumber } from '@/lib/telnyx/messaging-profile'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET  /api/admin/telnyx/backfill-messaging-profiles
 *   Read-only: reports every rep DID's current messaging_profile_id
 *   against the one that carries the 10DLC campaign, without changing
 *   anything.
 * POST /api/admin/telnyx/backfill-messaging-profiles
 *   Idempotent fix: attaches every rep DID (sales_rep_phone_numbers)
 *   to TELNYX_MESSAGING_PROFILE_ID, and self-heals the stored phone_id
 *   (+ the mirrored sales_reps.telnyx_phone_id for whichever number is
 *   active) to the real Telnyx resource id.
 *
 * TWO bugs found live running this the first time:
 *  1. Numbers ordered via /v2/number_orders never got a messaging
 *     profile - no rep DID inherited the 10DLC campaign, so carriers
 *     filtered their SMS silently while calls worked fine.
 *  2. The "phone_id" every number was stored under is actually the
 *     ORDER's id, not the /v2/phone_numbers/{id} resource id - so the
 *     very first backfill attempt 404'd on every single number. Fixed
 *     by resolving the real id via GET filter[phone_number]=... first
 *     (lib/telnyx/messaging-profile.ts resolvePhoneNumberId). This
 *     also means the eviction/release path (releaseTelnyxNumber) was
 *     silently no-op-ing on every "deleted" number - fixed alongside.
 * Both are now automatic for every future number ordered
 * (provisionRepNumber/orderRepNumber). This route is the one-time
 * backfill + self-heal for numbers ordered before that fix, plus a
 * standing diagnostic if it's ever needed again. Sequential with a
 * short stagger - Telnyx rate-limited the first attempt when all 7
 * numbers fired concurrently.
 */

const TELNYX_API = 'https://api.telnyx.com/v2'
const STAGGER_MS = 350

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID
  if (!apiKey || !profileId) {
    return NextResponse.json({ error: 'TELNYX_API_KEY or TELNYX_MESSAGING_PROFILE_ID missing' }, { status: 500 })
  }

  const { data: numbers } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('id, rep_id, phone_number, phone_id, label, is_active')

  const results: any[] = []
  for (const n of numbers || []) {
    // Raw diagnostic first - shows exactly what the filter query
    // returned (match count, the actual numbers in the response) so a
    // filter-syntax problem or an unfiltered-list fallback is visible
    // instead of guessed at.
    const diag = await debugLookupPhoneNumber(n.phone_number)
    const base = {
      phone_number: n.phone_number, stored_phone_id: n.phone_id, label: n.label, is_active: n.is_active,
      lookup: diag,
    }
    if (!diag.ok || !diag.matched_id) {
      results.push({ ...base, resolved: false })
      await sleep(STAGGER_MS)
      continue
    }
    const r = await fetch(`${TELNYX_API}/phone_numbers/${encodeURIComponent(diag.matched_id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const j = r.ok ? await r.json().catch(() => null) as any : null
    const currentProfile: string | null = j?.data?.messaging_profile_id || null
    results.push({
      ...base,
      resolved: true,
      real_phone_id: diag.matched_id,
      stored_id_was_wrong: n.phone_id !== diag.matched_id,
      current_messaging_profile_id: currentProfile,
      registered: currentProfile === profileId,
      get_by_id_status: r.status,
    })
    await sleep(STAGGER_MS)
  }

  return NextResponse.json({
    success: true,
    diagnostic_version: 2,
    target_messaging_profile_id: profileId,
    total: results.length,
    registered: results.filter((r) => r.registered).length,
    numbers: results,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID
  if (!apiKey || !profileId) {
    return NextResponse.json({ error: 'TELNYX_API_KEY or TELNYX_MESSAGING_PROFILE_ID missing' }, { status: 500 })
  }

  const { data: numbers } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('id, rep_id, phone_number, phone_id, is_active')

  const results: any[] = []
  for (const n of numbers || []) {
    const attach = await attachToMessagingProfile(n.phone_number)
    if (attach.ok === true) {
      // Self-heal the stored id if it was wrong, and mirror onto
      // sales_reps for this rep's active number so the legacy field
      // (dialer-token route reads it) is correct too.
      if (n.phone_id !== attach.resolved_id) {
        await supabaseAdmin
          .from('sales_rep_phone_numbers')
          .update({ phone_id: attach.resolved_id })
          .eq('id', n.id)
        if (n.is_active) {
          await supabaseAdmin
            .from('sales_reps')
            .update({ telnyx_phone_id: attach.resolved_id })
            .eq('id', n.rep_id)
            .eq('telnyx_outbound_number', n.phone_number)
        }
      }
      results.push({ phone_number: n.phone_number, ok: true, resolved_id: attach.resolved_id, id_corrected: n.phone_id !== attach.resolved_id })
    } else {
      results.push({ phone_number: n.phone_number, ok: false, error: attach.error })
    }
    await sleep(STAGGER_MS)
  }

  const failed = results.filter((r) => !r.ok)
  logger.info('telnyx messaging-profile backfill run', {
    total: results.length, failed: failed.length, profileId,
  })

  return NextResponse.json({
    success: true,
    diagnostic_version: 2,
    target_messaging_profile_id: profileId,
    total: results.length,
    attached: results.length - failed.length,
    failed: failed.length,
    results,
    note: 'Carrier propagation for numbers newly joining an approved campaign is typically minutes.',
  })
}
