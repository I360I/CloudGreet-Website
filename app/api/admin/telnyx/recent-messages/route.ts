import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/telnyx/recent-messages?limit=20
 *
 * Fetches recent outbound messages from Telnyx with their carrier
 * delivery status. Useful when our send returned success but the
 * recipient never got the text - the carrier-side status field tells
 * you why (queued / sent / delivered / delivery_failed /
 * delivery_unconfirmed) and gives the per-carrier error code.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TELNYX_API_KEY not set' }, { status: 500 })

  const url = new URL(request.url)
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

  const params = new URLSearchParams()
  params.set('page[size]', String(limit))
  // Telnyx default sort is most-recent-first.

  const r = await fetch(`https://api.telnyx.com/v2/messages?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!r.ok) {
    const txt = await r.text().catch(() => r.statusText)
    return NextResponse.json({ error: `telnyx ${r.status}: ${txt.slice(0, 300)}` }, { status: 502 })
  }
  const j = await r.json().catch(() => ({})) as any

  // Distill into the fields we care about so the UI is readable.
  const messages = (j?.data || []).map((m: any) => ({
    id: m?.id,
    direction: m?.direction,
    type: m?.type,
    status: m?.to?.[0]?.status || m?.outbound?.status || m?.delivery_status || null,
    carrier_error_code: m?.errors?.[0]?.code || null,
    carrier_error_title: m?.errors?.[0]?.title || null,
    carrier_error_detail: m?.errors?.[0]?.detail || null,
    from: m?.from?.phone_number || m?.from || null,
    to: m?.to?.[0]?.phone_number || (Array.isArray(m?.to) ? m.to[0] : m?.to) || null,
    text: typeof m?.text === 'string' ? m.text.slice(0, 200) : null,
    sent_at: m?.sent_at || m?.received_at || m?.created_at || null,
    completed_at: m?.completed_at || null,
    messaging_profile_id: m?.messaging_profile_id || null,
  }))

  return NextResponse.json({ success: true, count: messages.length, messages })
}
