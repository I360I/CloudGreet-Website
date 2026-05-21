import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/telnyx/wire-rep-webhook
 *
 * Idempotent admin action that sets the SIP Connection (which every
 * rep dials through) to fire its Call Control events at
 * `/api/telnyx/rep-voice-webhook`. After this runs once, every rep
 * outbound call from any rep number is captured server-side - no
 * matter whether they dial through the in-app WebRTC dialer, a SIP
 * softphone, or the Telnyx mobile app.
 *
 * Body: none. Reads TELNYX_API_KEY + TELNYX_SIP_CONNECTION_ID from env.
 *
 * Returns:
 *   { ok: true, webhook_event_url, was_already_set }
 *
 * GET on this route reads the current connection state without
 * changing anything, for sanity-checking from the admin UI.
 */

const TELNYX_API = 'https://api.telnyx.com/v2'

function webhookUrlForThisDeploy(request: NextRequest): string {
  const base = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_BASE_URL
    || request.nextUrl.origin
  return `${base}/api/telnyx/rep-voice-webhook`
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  const connId = process.env.TELNYX_SIP_CONNECTION_ID
  if (!apiKey || !connId) {
    return NextResponse.json({ error: 'TELNYX_API_KEY or TELNYX_SIP_CONNECTION_ID missing' }, { status: 500 })
  }

  const conn = await getConnection(connId, apiKey)
  if (!conn.ok) {
    const err = (conn as { ok: false; error: string }).error
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const desired = webhookUrlForThisDeploy(request)
  return NextResponse.json({
    ok: true,
    connection_id: connId,
    connection_type: conn.data?.record_type,
    current_webhook_event_url: conn.data?.webhook_event_url || null,
    current_webhook_event_failover_url: conn.data?.webhook_event_failover_url || null,
    desired_webhook_event_url: desired,
    matches: conn.data?.webhook_event_url === desired,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  const connId = process.env.TELNYX_SIP_CONNECTION_ID
  if (!apiKey || !connId) {
    return NextResponse.json({ error: 'TELNYX_API_KEY or TELNYX_SIP_CONNECTION_ID missing' }, { status: 500 })
  }

  const desired = webhookUrlForThisDeploy(request)
  const conn = await getConnection(connId, apiKey)
  if (!conn.ok) {
    const err = (conn as { ok: false; error: string }).error
    return NextResponse.json({ error: err }, { status: 500 })
  }

  if (conn.data?.webhook_event_url === desired) {
    return NextResponse.json({
      ok: true,
      was_already_set: true,
      connection_id: connId,
      webhook_event_url: desired,
    })
  }

  // The right PATCH endpoint depends on whether it's a credential
  // connection or a SIP connection. We try the generic /connections
  // path first, then fall back.
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  const body = JSON.stringify({ webhook_event_url: desired })

  const recordType = conn.data?.record_type || 'credential_connection'
  const path = recordType === 'fqdn_connection' ? 'fqdn_connections'
    : recordType === 'ip_connection' ? 'ip_connections'
    : 'credential_connections'

  const patchRes = await fetch(`${TELNYX_API}/${path}/${connId}`, {
    method: 'PATCH',
    headers,
    body,
  })
  if (!patchRes.ok) {
    const txt = await patchRes.text().catch(() => '')
    logger.error('telnyx wire-rep-webhook PATCH failed', { status: patchRes.status, body: txt.slice(0, 300), path })
    return NextResponse.json({ error: `Telnyx PATCH ${path} failed (${patchRes.status}): ${txt.slice(0, 300)}` }, { status: 500 })
  }

  logger.info('telnyx rep-voice webhook wired', {
    connection_id: connId,
    previous: conn.data?.webhook_event_url || null,
    desired,
    path,
  })
  return NextResponse.json({
    ok: true,
    was_already_set: false,
    previous_webhook_event_url: conn.data?.webhook_event_url || null,
    webhook_event_url: desired,
    connection_id: connId,
    connection_type: recordType,
  })
}

async function getConnection(
  connectionId: string,
  apiKey: string,
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  // The /connections endpoint dispatches to whichever connection type
  // matches the id - so a single GET works whether it's a credential
  // connection, FQDN, or IP connection.
  const r = await fetch(`${TELNYX_API}/connections/${connectionId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!r.ok) {
    const t = await r.text().catch(() => '')
    return { ok: false, error: `Telnyx GET connections/${connectionId} failed (${r.status}): ${t.slice(0, 200)}` }
  }
  const j = await r.json().catch(() => null) as any
  return { ok: true, data: j?.data }
}
