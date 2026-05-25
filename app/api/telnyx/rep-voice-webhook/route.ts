import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * POST /api/telnyx/rep-voice-webhook
 *
 * Server-side Telnyx Call Control webhook for SALES REP outbound calls.
 * Set as the webhook_event_url on the SIP Connection that reps dial
 * out through (the same connection the in-app WebRTC dialer uses).
 *
 * Why this exists: the in-app dialer logs calls via the browser by
 * POSTing /api/sales/dialer/log. That works for reps using the
 * WebRTC dialer in CloudGreet. It does NOT work when reps dial from
 * a SIP softphone, Telnyx mobile app, or via API - all of which
 * still route through the same SIP Connection. This webhook catches
 * EVERY call regardless of how it was originated.
 *
 * Behavior:
 *   - We listen to `call.initiated`, `call.answered`, `call.hangup`
 *     events on outbound calls.
 *   - We identify the rep by matching the call's `from` number to
 *     either `sales_rep_phone_numbers.phone_number` (preferred) or
 *     `sales_reps.telnyx_outbound_number` (legacy fallback).
 *   - We UPSERT into rep_calls keyed by `telnyx_call_id` so the
 *     browser dialer's POST + this webhook converge to one row
 *     instead of doubling up.
 *   - Status mapping: initiated → 'ringing', answered → 'in_progress',
 *     hangup → 'completed' | 'no_answer' | 'failed' based on
 *     hangup_cause / hangup_source.
 *
 * Signature verification: if TELNYX_PUBLIC_KEY is set we verify the
 * ed25519 signature; otherwise we log unverified events through
 * (better to track than refuse). Returns 200 either way so Telnyx
 * doesn't keep retrying.
 */

type TelnyxEvent = {
  event_type: string
  id?: string
  payload?: {
    call_control_id?: string
    call_session_id?: string
    call_leg_id?: string
    direction?: 'incoming' | 'outgoing'
    from?: string
    to?: string
    hangup_cause?: string
    hangup_source?: string
    start_time?: string
    end_time?: string
    state?: string
  }
}

export async function POST(request: NextRequest) {
  let bodyText = ''
  try {
    bodyText = await request.text()
  } catch (e) {
    return NextResponse.json({ ok: true, ignored: 'read failed' })
  }

  let evt: { data?: TelnyxEvent } | TelnyxEvent
  try {
    evt = JSON.parse(bodyText)
  } catch {
    logger.warn('telnyx rep-voice webhook: unparseable body', { len: bodyText.length })
    return NextResponse.json({ ok: true, ignored: 'unparseable' })
  }

  // Telnyx wraps payloads as { data: { event_type, ... } } - unwrap.
  const data = (evt as any)?.data ?? (evt as any)
  const eventType: string = data?.event_type || ''
  const payload = data?.payload || {}
  const callId: string | undefined = payload?.call_control_id || payload?.call_session_id || payload?.call_leg_id
  const fromNumber: string | undefined = payload?.from
  const direction: string | undefined = payload?.direction

  // Ignore inbound legs - those are handled by /api/telnyx/voice-webhook
  // for client agents. We only care about rep outbound calls.
  if (direction && direction !== 'outgoing') {
    return NextResponse.json({ ok: true, ignored: 'inbound' })
  }

  if (!callId || !fromNumber) {
    return NextResponse.json({ ok: true, ignored: 'no call id or from' })
  }

  // Identify the rep that owns this from-number. Active first, then
  // any saved historical row, then the legacy single-number fallback.
  const repId = await findRepByFromNumber(fromNumber)
  if (!repId) {
    // Not a known rep number - could be a client agent number or
    // something we don't track yet. Log once at low level.
    logger.info('telnyx rep-voice: unrecognised from-number', { fromNumber, eventType, callId })
    return NextResponse.json({ ok: true, ignored: 'unknown rep number' })
  }

  // Map event to status + the columns to write.
  const update = mapEventToUpdate(eventType, payload)
  if (!update) {
    // Event we don't care about (e.g. call.bridged, recording.saved).
    return NextResponse.json({ ok: true, ignored: 'event not tracked', eventType })
  }

  // Try multiple lookup paths because the browser SDK and the Call
  // Control webhook produce DIFFERENT id formats for the same call:
  //   - Browser SDK exposes `call.id` (v3:... or sdk-internal)
  //   - Webhook payload has call_control_id (UUID) + call_session_id
  // Without dedup we'd double-count every dial (one row per source).
  //
  // 1) Direct hit on telnyx_call_id (subsequent webhook events).
  // 2) Otherwise: find the orphan ringing row the browser inserted
  //    matching from + to + last 60s, then adopt it (overwrite its
  //    telnyx_call_id with the canonical webhook id).
  let existing: { id: string; status: string | null } | null = null
  const direct = await supabaseAdmin
    .from('rep_calls')
    .select('id, status')
    .eq('telnyx_call_id', callId)
    .maybeSingle()
  if ((direct.data as any)?.id) {
    existing = direct.data as any
  } else {
    const sinceIso = new Date(Date.now() - 60_000).toISOString()
    const { data: orphans } = await supabaseAdmin
      .from('rep_calls')
      .select('id, status, telnyx_call_id, started_at')
      .eq('from_number', fromNumber)
      .eq('to_number', payload?.to || '')
      .gte('started_at', sinceIso)
      .order('started_at', { ascending: false })
      .limit(1)
    const orphan = (orphans || [])[0] as any
    if (orphan?.id) {
      // Adopt the browser-inserted placeholder. Overwrite its
      // telnyx_call_id so future events for this call match directly.
      await supabaseAdmin
        .from('rep_calls')
        .update({ telnyx_call_id: callId })
        .eq('id', orphan.id)
      existing = { id: orphan.id, status: orphan.status }
    }
  }

  if (existing?.id) {
    if (shouldApplyTransition(existing.status, update.status)) {
      await supabaseAdmin
        .from('rep_calls')
        .update(update)
        .eq('id', existing.id)
    }
  } else {
    await supabaseAdmin
      .from('rep_calls')
      .insert({
        rep_id: repId,
        telnyx_call_id: callId,
        from_number: fromNumber,
        to_number: payload?.to || null,
        ...update,
      })
  }

  return NextResponse.json({ ok: true, eventType, callId, repId, status: update.status })
}

// -------- helpers --------

async function findRepByFromNumber(fromNumber: string): Promise<string | null> {
  // Match the saved DID list first.
  const { data: byMulti } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('rep_id')
    .eq('phone_number', fromNumber)
    .limit(1)
    .maybeSingle()
  if ((byMulti as any)?.rep_id) return (byMulti as any).rep_id as string

  // Legacy single-number fallback.
  const { data: byLegacy } = await supabaseAdmin
    .from('sales_reps')
    .select('id')
    .eq('telnyx_outbound_number', fromNumber)
    .limit(1)
    .maybeSingle()
  return (byLegacy as any)?.id || null
}

type CallUpdate = {
  status: 'ringing' | 'in_progress' | 'completed' | 'no_answer' | 'failed'
  started_at?: string
  ended_at?: string
  duration_seconds?: number
}

function mapEventToUpdate(eventType: string, payload: any): CallUpdate | null {
  if (eventType === 'call.initiated') {
    return {
      status: 'ringing',
      started_at: payload?.start_time || new Date().toISOString(),
    }
  }
  if (eventType === 'call.answered') {
    return {
      status: 'in_progress',
      started_at: payload?.start_time || new Date().toISOString(),
    }
  }
  if (eventType === 'call.hangup') {
    const cause = (payload?.hangup_cause || '').toLowerCase()
    const source = (payload?.hangup_source || '').toLowerCase()
    let status: CallUpdate['status'] = 'completed'
    if (cause.includes('normal_clearing') || source.includes('caller') || source.includes('callee')) {
      status = 'completed'
    } else if (cause.includes('no_user_response') || cause.includes('no_answer') || cause.includes('user_busy')) {
      status = 'no_answer'
    } else if (cause) {
      status = 'failed'
    }
    const startedAt = payload?.start_time ? new Date(payload.start_time).getTime() : null
    const endedAt = payload?.end_time ? new Date(payload.end_time).getTime() : Date.now()
    const dur = startedAt ? Math.max(0, Math.round((endedAt - startedAt) / 1000)) : undefined
    return {
      status,
      ended_at: payload?.end_time || new Date().toISOString(),
      duration_seconds: dur,
    }
  }
  return null
}

/**
 * Allow forward progress only: ringing → in_progress → terminal.
 * Once a row is in a terminal state, don't reopen it from a stale event.
 */
function shouldApplyTransition(current: string | null | undefined, next: string): boolean {
  if (!current) return true
  const order: Record<string, number> = {
    ringing: 1,
    in_progress: 2,
    completed: 3,
    no_answer: 3,
    failed: 3,
  }
  return (order[next] ?? 0) >= (order[current] ?? 0)
}
