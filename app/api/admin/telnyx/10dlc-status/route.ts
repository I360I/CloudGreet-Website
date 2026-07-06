import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Strips webhook-signing secrets and other credential-shaped fields
 *  before a Telnyx object ever leaves this route - a messaging profile
 *  response includes v1_secret (its webhook signing key) in plaintext. */
function redactSecrets(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  const clone: any = Array.isArray(obj) ? [...obj] : { ...obj }
  for (const key of Object.keys(clone)) {
    if (/secret|token|api_key|password/i.test(key)) {
      clone[key] = '[redacted]'
    } else if (clone[key] && typeof clone[key] === 'object') {
      clone[key] = redactSecrets(clone[key])
    }
  }
  return clone
}

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

  // Every messaging profile on the account - if a DIFFERENT profile
  // carries the actual approved 10DLC campaign, this is how we'd find
  // it instead of only ever looking at the one profile our env var
  // happens to point to.
  const allProfilesRes = await fetch('https://api.telnyx.com/v2/messaging_profiles?page[size]=50', { headers })
  const allProfilesText = await allProfilesRes.text().catch(() => '')
  let allProfiles: any = null
  try { allProfiles = JSON.parse(allProfilesText) } catch { /* keep raw */ }

  const { data: numbers } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('phone_number, label, is_active')

  // Include known SMS-sending numbers OUTSIDE the rep dialer pool -
  // e.g. a toll-free number sending real customer texts successfully.
  // Toll-free numbers use Toll-Free Verification, NOT 10DLC, so an
  // empty campaign record here doesn't mean anything is broken for
  // it - it's a control to see whether ANY number on this account has
  // an actual 10DLC campaign record at all, local numbers or not.
  const { data: bizNumbers } = await supabaseAdmin
    .from('businesses')
    .select('sms_phone_number')
    .not('sms_phone_number', 'is', null)
    .neq('sms_phone_number', '+15550000001')
    .limit(3)
  const referenceNumbers = Array.from(new Set((bizNumbers || []).map((b: any) => b.sms_phone_number).filter(Boolean)))

  const checkList = [
    ...(numbers || []).map((n) => ({ phone_number: n.phone_number, label: n.label, is_active: n.is_active, kind: 'rep_did' })),
    ...referenceNumbers.map((num) => ({ phone_number: num, label: 'reference (business SMS number)', is_active: null, kind: 'reference' })),
  ]

  const perNumber: any[] = []
  for (const n of checkList) {
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
      kind: n.kind,
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
      raw: redactSecrets(profile) ?? profileRaw?.slice(0, 800),
    },
    all_messaging_profiles: (allProfiles?.data || []).map((p: any) => ({
      id: p.id, name: p.name, enabled: p.enabled,
    })),
    numbers: perNumber.map((n) => ({ ...n, raw: redactSecrets(n.raw) })),
  })
}
