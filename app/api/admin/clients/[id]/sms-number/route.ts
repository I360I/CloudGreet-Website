import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/clients/[id]/sms-number
 *   Returns the business's current SMS number + live TFV status pulled
 *   from Telnyx. UI uses this to show "Not provisioned / Pending / Live"
 *   without needing the admin to log into the Telnyx portal.
 *
 * POST /api/admin/clients/[id]/sms-number
 *   body: { phone_number: string, sms_agent_enabled?: boolean }
 *   Assigns an existing Telnyx number we already own to this client.
 *   Does NOT provision a new number - that's a separate endpoint so
 *   admin chooses intentionally between "use existing" vs "buy new +
 *   submit TFV". Returns the assigned number + live TFV status.
 *
 * DELETE /api/admin/clients/[id]/sms-number
 *   Clears sms_phone_number. The number stays purchased on Telnyx -
 *   it just stops routing to this business. Useful when reassigning
 *   to a different client.
 */

const TELNYX_BASE = 'https://api.telnyx.com/v2'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('business_name, phone_number, sms_phone_number, sms_agent_enabled')
    .eq('id', params.id)
    .maybeSingle()
  if (!biz) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const number = (biz as any).sms_phone_number || null
  const tfvStatus = number ? await lookupTfvStatus(number) : null

  return NextResponse.json({
    success: true,
    business_name: (biz as any).business_name,
    sms_phone_number: number,
    voice_phone_number: (biz as any).phone_number,
    sms_agent_enabled: (biz as any).sms_agent_enabled !== false,
    tfv: tfvStatus,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    phone_number?: string
    sms_agent_enabled?: boolean
  }
  const phone = (body.phone_number || '').trim()
  if (!phone) return NextResponse.json({ error: 'phone_number required' }, { status: 400 })
  if (!/^\+\d{10,15}$/.test(phone)) {
    return NextResponse.json({ error: 'phone_number must be E.164 (e.g., +18336940507)' }, { status: 400 })
  }

  // Sanity check: the number must be on our Telnyx account. Without
  // this, the admin could type any string and the webhook routing
  // would silently never match real inbound traffic.
  const telnyxNum = await lookupTelnyxNumber(phone)
  if (!telnyxNum) {
    return NextResponse.json({
      error: `${phone} is not on the CloudGreet Telnyx account. Buy/port it first, then assign.`,
    }, { status: 400 })
  }

  // Don't allow assigning the platform notifications number to a
  // single client - it would steal inbound replies from every other
  // business's notification SMS.
  const platformFrom = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (platformFrom && phone === platformFrom) {
    return NextResponse.json({
      error: 'This number is the platform notifications sender and cannot be assigned to a single client.',
    }, { status: 400 })
  }

  const update: Record<string, any> = {
    sms_phone_number: phone,
    updated_at: new Date().toISOString(),
  }
  if (typeof body.sms_agent_enabled === 'boolean') {
    update.sms_agent_enabled = body.sms_agent_enabled
  }

  const { error } = await supabaseAdmin
    .from('businesses')
    .update(update)
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logger.info('admin assigned sms number', { businessId: params.id, phone })
  const tfvStatus = await lookupTfvStatus(phone)
  return NextResponse.json({ success: true, sms_phone_number: phone, tfv: tfvStatus })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('businesses')
    .update({ sms_phone_number: null, updated_at: new Date().toISOString() })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

/* ---------- Telnyx helpers ---------- */

async function lookupTelnyxNumber(phone: string): Promise<{ phone_number: string; messaging_profile_id: string | null } | null> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      `${TELNYX_BASE}/phone_numbers?filter%5Bphone_number%5D=${encodeURIComponent(phone)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    )
    if (!res.ok) return null
    const j = await res.json() as any
    const d = (j?.data || [])[0]
    if (!d) return null
    return { phone_number: d.phone_number, messaging_profile_id: d.messaging_profile_id }
  } catch { return null }
}

async function lookupTfvStatus(phone: string): Promise<{
  request_id: string | null
  status: string
  reason: string | null
  submitted_at: string | null
  updated_at: string | null
} | null> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      `${TELNYX_BASE}/messaging_tollfree/verification/requests?page=1&page_size=50`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    )
    if (!res.ok) return null
    const j = await res.json() as any
    const records = j?.records || j?.data || []
    for (const r of records) {
      const phones = (r.phoneNumbers || []).map((p: any) => p.phoneNumber || p.phone_number)
      if (phones.includes(phone)) {
        return {
          request_id: r.id,
          status: r.verificationStatus || r.status || 'unknown',
          reason: r.reason || null,
          submitted_at: r.createdAt || null,
          updated_at: r.updatedAt || null,
        }
      }
    }
    return { request_id: null, status: 'not_submitted', reason: null, submitted_at: null, updated_at: null }
  } catch { return null }
}
