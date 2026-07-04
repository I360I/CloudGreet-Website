import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { telnyxClient } from '@/lib/telnyx'
import { logger } from '@/lib/monitoring'
import { listRepNumbers } from '@/lib/telnyx/rep-numbers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/dialer/sms
 *   body: { lead_id, body }
 *
 * Post-call SMS follow-up from the dialer cockpit. Sends from the rep's
 * active DID (falls back to TELNYX_REP_SMS_FROM_NUMBER, then
 * TELNYX_OUTBOUND_FROM_NUMBER), logs to rep_messages, and appends a
 * note on the lead so the thread shows up everywhere notes do.
 *
 * COMPLIANCE: the from-number must be attached to a Telnyx Messaging
 * Profile with A2P 10DLC registration or carriers will drop/flag the
 * messages. Telnyx's error is surfaced verbatim to the UI so a
 * misconfigured number fails loudly, not silently. Inbound STOP
 * handling (rep-sms-webhook) flips the lead to do_not_call.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { lead_id?: string; body?: string }
  const text = (body.body || '').trim()
  if (!body.lead_id || !text) {
    return NextResponse.json({ error: 'lead_id and body are required' }, { status: 400 })
  }
  if (text.length > 1200) {
    return NextResponse.json({ error: 'Message too long (1200 char max)' }, { status: 400 })
  }

  // Lead must be assigned to this rep, have a phone, and not be DNC -
  // same enforcement point pattern as the dial log route.
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id, status')
    .eq('rep_id', auth.userId)
    .eq('lead_id', body.lead_id)
    .maybeSingle()
  if (!assignment) return NextResponse.json({ error: 'Not your lead' }, { status: 404 })
  if (assignment.status === 'do_not_call') {
    return NextResponse.json({ error: 'Lead is marked Do Not Call' }, { status: 403 })
  }

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, phone, business_name')
    .eq('id', body.lead_id)
    .maybeSingle()
  if (!lead?.phone) return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })

  // From-number: rep's active DID first, env fallbacks after.
  let fromNumber = process.env.TELNYX_REP_SMS_FROM_NUMBER || process.env.TELNYX_OUTBOUND_FROM_NUMBER || ''
  try {
    const nums = await listRepNumbers(auth.userId)
    const active = (nums as any[])?.find((n) => n.is_active)
    if (active?.phone_number) fromNumber = active.phone_number
  } catch { /* env fallback */ }
  if (!fromNumber) {
    return NextResponse.json({ error: 'No from-number configured for SMS' }, { status: 503 })
  }

  try {
    const resp = await telnyxClient.sendSMS(lead.phone, text, fromNumber)
    const messageId = resp?.data?.id || null

    await supabaseAdmin.from('rep_messages').insert({
      rep_id: auth.userId,
      lead_id: lead.id,
      direction: 'outbound',
      from_number: fromNumber,
      to_number: lead.phone,
      body: text,
      telnyx_message_id: messageId,
      status: 'sent',
    })
    // Mirror into the lead's note thread so every surface that shows
    // notes shows the text too.
    await supabaseAdmin.from('lead_notes').insert({
      lead_id: lead.id,
      rep_id: auth.userId,
      body: `SMS sent: ${text}`,
    }).then((r) => r, () => null)

    return NextResponse.json({ success: true, message_id: messageId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'SMS send failed'
    logger.error('Rep SMS send failed', { error: msg, lead_id: lead.id })
    // Surface Telnyx's reason - usually "number not on a messaging
    // profile" until 10DLC setup is done.
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
