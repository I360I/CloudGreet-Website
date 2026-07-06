import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/telnyx/10dlc-status
 *
 * Read-only. Answers the actual question the messaging-profile
 * diagnostic can't: is each rep number REGISTERED under a 10DLC
 * campaign right now, per Telnyx's own 10DLC API - not just "is it
 * attached to the messaging profile" (attachment and campaign
 * registration are separate steps with a propagation delay between
 * them; a live send to the setter's number failed with Telnyx's own
 * DLR reason "not 10DLC-registered" even though the number was
 * already correctly attached to the profile at send time).
 *
 * Hits /v2/10dlc/phoneNumberCampaign filtered by number - the
 * authoritative per-number registration record - plus the messaging
 * profile's own campaign linkage for context. Response shapes here
 * are best-effort against Telnyx's docs; raw bodies are included so a
 * wrong field guess is still visible instead of silently swallowed.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID
  if (!apiKey) return NextResponse.json({ error: 'TELNYX_API_KEY missing' }, { status: 500 })

  const headers = { Authorization: `Bearer ${apiKey}` }

  // The messaging profile itself - some Telnyx accounts surface the
  // linked campaign id directly on the profile record.
  let profile: any = null
  let profileRaw: string | null = null
  if (profileId) {
    const r = await fetch(`https://api.telnyx.com/v2/messaging_profiles/${encodeURIComponent(profileId)}`, { headers })
    profileRaw = await r.text().catch(() => '')
    try { profile = JSON.parse(profileRaw) } catch { /* keep raw */ }
  }

  const { data: numbers } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('phone_number, label, is_active')

  const perNumber: any[] = []
  for (const n of numbers || []) {
    const params = new URLSearchParams()
    params.set('filter[phoneNumber]', n.phone_number)
    const r = await fetch(`https://api.telnyx.com/v2/10dlc/phoneNumberCampaign?${params}`, { headers })
    const text = await r.text().catch(() => '')
    let j: any = null
    try { j = JSON.parse(text) } catch { /* keep raw */ }
    perNumber.push({
      phone_number: n.phone_number,
      label: n.label,
      is_active: n.is_active,
      http_status: r.status,
      // Best-guess fields per Telnyx docs - surfaced raw too so a
      // wrong guess doesn't hide the real answer.
      campaign_id: j?.data?.campaignId ?? j?.data?.[0]?.campaignId ?? null,
      registration_status: j?.data?.status ?? j?.data?.[0]?.status ?? null,
      raw: j ?? text.slice(0, 500),
    })
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  return NextResponse.json({
    success: true,
    messaging_profile: {
      id: profileId,
      http_status: profile ? undefined : null,
      raw: profile ?? profileRaw?.slice(0, 800),
    },
    numbers: perNumber,
  })
}
