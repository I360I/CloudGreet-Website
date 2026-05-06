import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/telnyx/create-credential
 *   body: { connection_id: string, name?: string }
 *
 * Creates a Telnyx Telephony Credential bound to the given SIP
 * Connection and returns its ID. Used as a one-click escape hatch
 * because Telnyx's portal hides this resource behind a non-obvious
 * navigation path - rather than have admin treasure-hunt the UI we
 * just hit the API directly with the server-side TELNYX_API_KEY.
 *
 * The returned `id` is exactly what goes into the
 * TELNYX_TELEPHONY_CREDENTIAL_ID env var.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'TELNYX_API_KEY is not set in env' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({})) as { connection_id?: string; name?: string }
  const connectionId = (body.connection_id || '').trim()
  if (!connectionId) {
    return NextResponse.json({ error: 'connection_id required' }, { status: 400 })
  }

  try {
    const r = await fetch('https://api.telnyx.com/v2/telephony_credentials', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection_id: connectionId,
        name: body.name || 'CloudGreet Dialer Cred',
      }),
    })
    const text = await r.text()
    let parsed: any = null
    try { parsed = JSON.parse(text) } catch {}
    if (!r.ok) {
      logger.error('telnyx create credential failed', { status: r.status, body: text.slice(0, 400) })
      return NextResponse.json({
        error: `Telnyx returned ${r.status}`,
        detail: parsed?.errors?.[0]?.detail || parsed?.error || text.slice(0, 300),
      }, { status: 502 })
    }
    const id = parsed?.data?.id
    if (!id) {
      return NextResponse.json({ error: 'Telnyx returned no id', raw: parsed }, { status: 502 })
    }
    return NextResponse.json({
      success: true,
      id,
      name: parsed?.data?.name || null,
      connection_id: connectionId,
    })
  } catch (e) {
    logger.error('telnyx create credential threw', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to call Telnyx' }, { status: 500 })
  }
}
