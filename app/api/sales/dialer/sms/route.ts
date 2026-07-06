import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { telnyxClient } from '@/lib/telnyx'
import { logger } from '@/lib/monitoring'
import { listRepNumbers } from '@/lib/telnyx/rep-numbers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/dialer/sms
 *   ?lead_id=X[&mark_read=1]  - full thread with one lead (asc); mark_read
 *                               stamps that lead's inbound rows read.
 *   ?inbox=1                  - latest message per lead + per-thread and
 *                               total unread counts (the Messages page).
 *   ?unread_count=1           - just the total unread number (cheap; the
 *                               nav badge polls this, backed by the
 *                               idx_rep_messages_unread partial index).
 *
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
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const url = new URL(request.url)

  // Nav badge: total unread inbound texts, nothing else.
  if (url.searchParams.get('unread_count') === '1') {
    const { count } = await supabaseAdmin
      .from('rep_messages')
      .select('id', { count: 'exact', head: true })
      .eq('rep_id', auth.userId)
      .eq('direction', 'inbound')
      .is('read_at', null)
    return NextResponse.json({ success: true, unread: count || 0 })
  }

  // Inbox: one row per thread - latest message + unread count. Threads
  // are keyed by lead when the sender matched one, otherwise by the
  // counterpart phone number (a prospect texting from a number we don't
  // have on a lead must still be visible, not just counted). Grouped in
  // memory over the rep's recent messages rather than a SQL window
  // function; 500 rows covers weeks of texting for one rep.
  if (url.searchParams.get('inbox') === '1') {
    const { data: msgs, error } = await supabaseAdmin
      .from('rep_messages')
      .select('lead_id, direction, from_number, to_number, body, created_at, read_at')
      .eq('rep_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type Thread = {
      lead_id: string | null; phone: string | null; last_body: string
      last_direction: string; last_at: string; unread: number
    }
    const threads = new Map<string, Thread>()
    let totalUnread = 0
    for (const m of (msgs || []) as any[]) {
      const counterpart = m.direction === 'inbound' ? m.from_number : m.to_number
      const key = m.lead_id || `phone:${counterpart}`
      let t = threads.get(key)
      if (!t) {
        t = {
          lead_id: m.lead_id || null, phone: m.lead_id ? null : counterpart,
          last_body: m.body || '', last_direction: m.direction, last_at: m.created_at, unread: 0,
        }
        threads.set(key, t)
      }
      if (m.direction === 'inbound' && !m.read_at) { t.unread += 1; totalUnread += 1 }
    }

    const ids = Array.from(threads.values()).map((t) => t.lead_id).filter(Boolean) as string[]
    const leadById = new Map<string, any>()
    if (ids.length > 0) {
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('id, business_name, contact_name, phone')
        .in('id', ids)
      for (const l of (leads || []) as any[]) leadById.set(l.id, l)
    }

    return NextResponse.json({
      success: true,
      total_unread: totalUnread,
      threads: Array.from(threads.values()).map((t) => ({
        ...t,
        business_name: t.lead_id ? (leadById.get(t.lead_id)?.business_name || null) : null,
        contact_name: t.lead_id ? (leadById.get(t.lead_id)?.contact_name || null) : null,
        phone: t.lead_id ? (leadById.get(t.lead_id)?.phone || null) : t.phone,
      })),
    })
  }

  // Thread by phone number: messages with a counterpart that never
  // matched a lead. Rep-scoped by definition; read-only apart from the
  // mark-read stamp (the composer needs a lead to send).
  const phone = url.searchParams.get('phone')
  if (!url.searchParams.get('lead_id') && phone) {
    const { data: messages, error } = await supabaseAdmin
      .from('rep_messages')
      .select('id, direction, from_number, to_number, body, status, created_at, read_at')
      .eq('rep_id', auth.userId)
      .is('lead_id', null)
      .or(`from_number.eq.${phone},to_number.eq.${phone}`)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (url.searchParams.get('mark_read') === '1') {
      await supabaseAdmin
        .from('rep_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('rep_id', auth.userId)
        .is('lead_id', null)
        .eq('from_number', phone)
        .eq('direction', 'inbound')
        .is('read_at', null)
    }

    return NextResponse.json({ success: true, messages: messages || [] })
  }

  // Thread with one lead. Same ownership check as POST - the messages
  // are already rep-scoped, but a non-assigned lead_id should 404, not
  // return an empty thread.
  const leadId = url.searchParams.get('lead_id')
  if (!leadId) return NextResponse.json({ error: 'lead_id, phone, inbox=1, or unread_count=1 required' }, { status: 400 })

  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', leadId)
    .maybeSingle()
  if (!assignment) return NextResponse.json({ error: 'Not your lead' }, { status: 404 })

  const { data: messages, error } = await supabaseAdmin
    .from('rep_messages')
    .select('id, direction, from_number, to_number, body, status, created_at, read_at')
    .eq('rep_id', auth.userId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (url.searchParams.get('mark_read') === '1') {
    await supabaseAdmin
      .from('rep_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('rep_id', auth.userId)
      .eq('lead_id', leadId)
      .eq('direction', 'inbound')
      .is('read_at', null)
  }

  return NextResponse.json({ success: true, messages: messages || [] })
}

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

  // From-number: the rep's active DID, and ONLY that. There used to be
  // an env-number fallback here, but replies to a shared fallback number
  // can't be routed back to any rep - the owner's live test proved texts
  // to it just vanish. Better to refuse the send than lose the reply.
  let fromNumber = ''
  try {
    const nums = await listRepNumbers(auth.userId)
    const active = (nums as any[])?.find((n) => n.is_active)
    if (active?.phone_number) fromNumber = active.phone_number
  } catch { /* handled below */ }
  if (!fromNumber) {
    return NextResponse.json({
      error: 'No dialer number assigned to your account - texts need one so replies come back to you. Ask admin.',
    }, { status: 409 })
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
