import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/dialer/token
 *
 * Mints a short-lived Telnyx WebRTC login token the browser passes to
 * @telnyx/webrtc to register a softphone. We never expose
 * TELNYX_API_KEY to the client - the API key lives server-side and
 * mints scoped tokens.
 *
 * Setup the admin does once, in the Telnyx portal:
 *   1. Voice → SIP Trunking → create a "Credentials" connection
 *   2. Voice → Programmable Voice → Telephony Credentials → create
 *      one credential under that connection. Note the credential id.
 *   3. Buy a phone number, assign it to the connection.
 *
 * Then env:
 *   TELNYX_API_KEY                   (already required by the app)
 *   TELNYX_TELEPHONY_CREDENTIAL_ID   (from step 2)
 *   TELNYX_OUTBOUND_FROM_NUMBER      (E.164, e.g. +15125550100)
 *
 * Without those env vars set, the endpoint returns 503 + a clear
 * setup-needed error so the dialer UI can render an "ask Anthony to
 * finish Telnyx setup" message instead of a generic crash.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const apiKey = process.env.TELNYX_API_KEY
  const credentialId = process.env.TELNYX_TELEPHONY_CREDENTIAL_ID
  const envFromNumber = process.env.TELNYX_OUTBOUND_FROM_NUMBER

  // Prefer the rep's own Telnyx DID. Sources, in order:
  //   1. legacy sales_reps.telnyx_outbound_number (sales reps)
  //   2. active sales_rep_phone_numbers row (setters have no sales_reps
  //      row by design, but do own DIDs - without this they dialed out
  //      from the shared env number)
  //   3. shared env default (last resort so the dialer keeps working
  //      for reps whose provisioning failed or hasn't run yet)
  const [{ data: rep }, { data: activeNum }] = await Promise.all([
    supabaseAdmin
      .from('sales_reps')
      .select('telnyx_outbound_number')
      .eq('id', auth.userId)
      .maybeSingle(),
    supabaseAdmin
      .from('sales_rep_phone_numbers')
      .select('phone_number')
      .eq('rep_id', auth.userId)
      .eq('is_active', true)
      .eq('is_sms_line', false)
      .limit(1)
      .maybeSingle(),
  ])
  const fromNumber = rep?.telnyx_outbound_number || activeNum?.phone_number || envFromNumber

  if (!apiKey || !credentialId || !fromNumber) {
    return NextResponse.json({
      error: 'Dialer not configured',
      setup_needed: {
        TELNYX_API_KEY: !apiKey,
        TELNYX_TELEPHONY_CREDENTIAL_ID: !credentialId,
        TELNYX_OUTBOUND_FROM_NUMBER: !envFromNumber && !rep?.telnyx_outbound_number,
      },
    }, { status: 503 })
  }

  try {
    const r = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${encodeURIComponent(credentialId)}/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // Telnyx accepts an empty body; the credential's connection
        // determines codec/region. No need to pass ttl - the default
        // (1h) is fine for an active dialer session.
      },
    )
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      logger.error('telnyx token mint failed', { status: r.status, body: body.slice(0, 300) })
      return NextResponse.json({
        error: `Telnyx returned ${r.status}`,
        detail: body.slice(0, 200),
      }, { status: 502 })
    }
    const text = await r.text()
    // Per the docs the response is the raw JWT string in the body.
    // Older accounts may have wrapped it as { data: { token } }.
    let token = text.trim()
    if (token.startsWith('{')) {
      try {
        const j = JSON.parse(token)
        token = j?.data?.token || j?.token || ''
      } catch { /* fall through */ }
    }
    if (!token) {
      return NextResponse.json({ error: 'Empty token from Telnyx' }, { status: 502 })
    }
    return NextResponse.json({
      success: true,
      login_token: token,
      from_number: fromNumber,
    })
  } catch (e) {
    logger.error('telnyx token threw', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to mint token' }, { status: 500 })
  }
}
