import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/sms-booking
 *   Returns the client's SMS booking number + live status pulled from
 *   Telnyx. Used by the Settings page to show "Live / Pending review /
 *   Not provisioned" so the client knows when texting is open for their
 *   customers without needing to ask support.
 *
 * PATCH /api/dashboard/sms-booking
 *   body: { sms_agent_enabled: boolean }
 *   Client can disable their own SMS agent (e.g., they want to handle
 *   texts manually for a stretch). Re-enabling instantly resumes the
 *   AI agent on the same number.
 */

const TELNYX_BASE = 'https://api.telnyx.com/v2'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('business_name, sms_phone_number, sms_agent_enabled')
    .eq('id', auth.businessId)
    .maybeSingle()
  if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const number = (biz as any).sms_phone_number || null
  const tfv = number ? await lookupTfvStatus(number) : null

  // Translate Telnyx-side status into client-friendly labels.
  let clientStatus: 'live' | 'pending' | 'action_required' | 'not_provisioned' = 'not_provisioned'
  let clientMessage = "Text booking isn't set up for your business yet. Ask CloudGreet to provision a number."
  if (number) {
    const s = (tfv?.status || '').toLowerCase()
    if (s.includes('verified')) {
      clientStatus = 'live'
      clientMessage = 'Customers can text this number to get a quote or request a ride.'
    } else if (s.includes('waiting for customer')) {
      clientStatus = 'action_required'
      clientMessage = "Carrier compliance review needs more info from CloudGreet. We're on it."
    } else if (s.includes('waiting') || s.includes('pending')) {
      clientStatus = 'pending'
      clientMessage = "Carrier compliance review in progress. Usually 1-3 business days. We'll text you when it's live."
    } else if (s === 'not_submitted') {
      clientStatus = 'pending'
      clientMessage = 'Number provisioned. CloudGreet is submitting carrier compliance paperwork.'
    } else {
      clientStatus = 'pending'
      clientMessage = `Status: ${tfv?.status || 'unknown'}.`
    }
  }

  return NextResponse.json({
    success: true,
    sms_phone_number: number,
    sms_agent_enabled: (biz as any).sms_agent_enabled !== false,
    status: clientStatus,
    status_message: clientMessage,
    last_updated_at: tfv?.updated_at || null,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as { sms_agent_enabled?: boolean }
  if (typeof body.sms_agent_enabled !== 'boolean') {
    return NextResponse.json({ error: 'sms_agent_enabled boolean required' }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from('businesses')
    .update({ sms_agent_enabled: body.sms_agent_enabled, updated_at: new Date().toISOString() })
    .eq('id', auth.businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, sms_agent_enabled: body.sms_agent_enabled })
}

async function lookupTfvStatus(phone: string): Promise<{
  status: string
  reason: string | null
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
          status: r.verificationStatus || r.status || 'unknown',
          reason: r.reason || null,
          updated_at: r.updatedAt || null,
        }
      }
    }
    return { status: 'not_submitted', reason: null, updated_at: null }
  } catch { return null }
}
