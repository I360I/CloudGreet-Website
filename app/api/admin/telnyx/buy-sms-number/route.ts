import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/telnyx/buy-sms-number
 * Body: { area_code?: string, messaging_profile_id?: string }
 *
 * Search → order → attach to messaging profile, in one call.
 * Defaults messaging_profile_id from env. Returns the new E.164 number
 * so the operator can paste it into CLOUDGREET_NOTIFICATIONS_FROM in Vercel.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TELNYX_API_KEY not set' }, { status: 500 })

  const body = await request.json().catch(() => ({})) as {
    area_code?: string
    messaging_profile_id?: string
  }

  const areaCode = (body.area_code || '').toString().replace(/\D/g, '').slice(0, 3) || undefined
  const messagingProfileId =
    (body.messaging_profile_id || process.env.TELNYX_MESSAGING_PROFILE_ID || '').toString().trim()

  if (!messagingProfileId) {
    return NextResponse.json({
      error: 'No messaging_profile_id (pass one or set TELNYX_MESSAGING_PROFILE_ID).',
    }, { status: 400 })
  }

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  // 1. search SMS-capable local US numbers
  const search = async (ac?: string): Promise<string | null> => {
    const params = new URLSearchParams()
    params.set('filter[country_code]', 'US')
    params.set('filter[features][]', 'sms')
    params.set('filter[phone_number_type]', 'local')
    params.set('filter[limit]', '1')
    if (ac) params.set('filter[national_destination_code]', ac)
    const r = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params}`, { headers })
    if (!r.ok) return null
    const j = await r.json().catch(() => null) as any
    const num = j?.data?.[0]?.phone_number
    return typeof num === 'string' ? num : null
  }

  let phoneNumber = await search(areaCode)
  if (!phoneNumber && areaCode) phoneNumber = await search()
  if (!phoneNumber) {
    return NextResponse.json({ error: 'No SMS-capable US local numbers available' }, { status: 502 })
  }

  // 2. order (attach messaging profile in the same call)
  const orderRes = await fetch('https://api.telnyx.com/v2/number_orders', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      phone_numbers: [{ phone_number: phoneNumber }],
      messaging_profile_id: messagingProfileId,
    }),
  })
  const orderText = await orderRes.text()
  let order: any = null
  try { order = JSON.parse(orderText) } catch { /* keep null */ }

  if (!orderRes.ok) {
    const detail = order?.errors?.[0]?.detail || orderText.slice(0, 300)
    logger.error('telnyx sms number order failed', { status: orderRes.status, detail })
    return NextResponse.json({ error: `Order failed (${orderRes.status}): ${detail}` }, { status: 502 })
  }

  const phoneId =
    order?.data?.phone_numbers?.[0]?.id ||
    order?.data?.id ||
    phoneNumber

  // 3. belt-and-suspenders: PATCH the number to ensure messaging profile sticks
  // (Telnyx sometimes orders complete async and the order-time profile is best-effort)
  if (phoneId && phoneId !== phoneNumber) {
    await fetch(`https://api.telnyx.com/v2/phone_numbers/${phoneId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ messaging_profile_id: messagingProfileId }),
    }).catch(() => null)
  }

  logger.info('telnyx sms number purchased', { phoneNumber, phoneId, messagingProfileId })

  return NextResponse.json({
    success: true,
    phone_number: phoneNumber,
    phone_id: phoneId,
    messaging_profile_id: messagingProfileId,
    next_steps: [
      `Set CLOUDGREET_NOTIFICATIONS_FROM=${phoneNumber} in Vercel and redeploy.`,
      `Register A2P 10DLC in Telnyx → Messaging → 10DLC for reliable delivery (works without it short-term).`,
      `Test from /admin/sms-test using your own cell.`,
    ],
  })
}
