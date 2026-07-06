import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { attachToMessagingProfile } from '@/lib/telnyx/messaging-profile'
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
 *   to TELNYX_MESSAGING_PROFILE_ID.
 *
 * Numbers ordered via /v2/number_orders never got a messaging profile
 * (provisionRepNumber/orderRepNumber didn't set one), so no rep DID
 * inherited the account's 10DLC campaign - carriers filter their SMS
 * silently while calls work fine. New numbers now attach automatically
 * at order time (lib/telnyx/messaging-profile.ts); this route is the
 * one-time backfill for every number ordered before that fix, run
 * after a fresh deploy since it hits the live phone_numbers table.
 */

const TELNYX_API = 'https://api.telnyx.com/v2'

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
  const results = await Promise.all((numbers || []).map(async (n) => {
    const r = await fetch(`${TELNYX_API}/phone_numbers/${encodeURIComponent(n.phone_id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const j = r.ok ? await r.json().catch(() => null) as any : null
    const currentProfile: string | null = j?.data?.messaging_profile_id || null
    return {
      phone_number: n.phone_number, phone_id: n.phone_id, label: n.label, is_active: n.is_active,
      current_messaging_profile_id: currentProfile,
      registered: currentProfile === profileId,
      lookup_error: r.ok ? null : `${r.status}`,
    }
  }))

  return NextResponse.json({
    success: true,
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
    .select('id, rep_id, phone_number, phone_id')

  const results = await Promise.all((numbers || []).map(async (n) => {
    const attach = await attachToMessagingProfile(n.phone_id)
    return { phone_number: n.phone_number, phone_id: n.phone_id, ok: attach.ok, error: attach.ok === false ? attach.error : null }
  }))

  const failed = results.filter((r) => !r.ok)
  logger.info('telnyx messaging-profile backfill run', {
    total: results.length, failed: failed.length, profileId,
  })

  return NextResponse.json({
    success: true,
    target_messaging_profile_id: profileId,
    total: results.length,
    attached: results.length - failed.length,
    failed: failed.length,
    results,
    note: 'Carrier propagation for numbers newly joining an approved campaign is typically minutes.',
  })
}
