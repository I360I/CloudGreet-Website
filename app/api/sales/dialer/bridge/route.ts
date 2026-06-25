import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/dialer/bridge
 * Initiates a bridge call: Telnyx calls the rep's forwarding number
 * (e.g. Google Voice), and when they answer it transfers them to the lead.
 *
 * Body: { to: string (lead E.164), leadId?: string }
 * Returns: { success: true, call_control_id: string }
 *
 * DELETE /api/sales/dialer/bridge
 * Hangs up an active bridge call.
 * Body: { call_control_id: string }
 */

async function getConnectionId(apiKey: string, credentialId: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${encodeURIComponent(credentialId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    )
    if (!r.ok) return null
    const j = await r.json()
    return j?.data?.connection_id || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const leadNumber: string = body?.to || ''
  const leadId: string | null = body?.leadId || null

  if (!leadNumber) {
    return NextResponse.json({ error: 'to is required' }, { status: 400 })
  }

  const apiKey = process.env.TELNYX_API_KEY
  const credentialId = process.env.TELNYX_TELEPHONY_CREDENTIAL_ID
  if (!apiKey || !credentialId) {
    return NextResponse.json({ error: 'Telnyx not configured' }, { status: 503 })
  }

  const { data: rep } = await supabaseAdmin
    .from('sales_reps')
    .select('forwarding_number, telnyx_outbound_number')
    .eq('id', auth.userId)
    .maybeSingle()

  const forwardingNumber = rep?.forwarding_number
  const fromNumber = rep?.telnyx_outbound_number || process.env.TELNYX_OUTBOUND_FROM_NUMBER

  if (!forwardingNumber) {
    return NextResponse.json({ error: 'No forwarding number configured for this rep' }, { status: 400 })
  }
  if (!fromNumber) {
    return NextResponse.json({ error: 'No outbound number configured' }, { status: 503 })
  }

  const connectionId = await getConnectionId(apiKey, credentialId)
  if (!connectionId) {
    return NextResponse.json({ error: 'Could not resolve Telnyx connection ID' }, { status: 503 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const webhookUrl = `${appUrl}/api/webhooks/telnyx-bridge`

  const clientState = Buffer.from(
    JSON.stringify({ leadNumber, fromNumber, leadId }),
  ).toString('base64')

  try {
    const r = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection_id: connectionId,
        to: forwardingNumber,
        from: fromNumber,
        client_state: clientState,
        webhook_url: webhookUrl,
        webhook_url_method: 'POST',
        timeout_secs: 30,
      }),
    })

    if (!r.ok) {
      const errText = await r.text().catch(() => '')
      logger.error('bridge: telnyx call create failed', { status: r.status, body: errText.slice(0, 300) })
      return NextResponse.json({ error: `Telnyx error ${r.status}`, detail: errText.slice(0, 200) }, { status: 502 })
    }

    const j = await r.json()
    const callControlId: string = j?.data?.call_control_id || ''
    logger.info('bridge: call initiated', { callControlId, forwardingNumber, leadNumber, repId: auth.userId })

    return NextResponse.json({ success: true, call_control_id: callControlId })
  } catch (err) {
    logger.error('bridge: threw', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to initiate bridge call' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const callControlId: string = body?.call_control_id || ''
  if (!callControlId) {
    return NextResponse.json({ error: 'call_control_id required' }, { status: 400 })
  }

  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Telnyx not configured' }, { status: 503 })
  }

  try {
    await fetch(
      `https://api.telnyx.com/v2/calls/${encodeURIComponent(callControlId)}/actions/hangup`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('bridge hangup threw', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Hangup failed' }, { status: 500 })
  }
}
