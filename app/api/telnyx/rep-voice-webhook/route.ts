import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * POST /api/telnyx/rep-voice-webhook
 *
 * Handles both OUTBOUND (rep dialing prospects) and INBOUND (someone
 * calling a rep's Telnyx number) call events for the CloudGreet Dialer
 * SIP connection.
 *
 * INBOUND FLOW:
 *   call.initiated (incoming) →
 *     answer inbound + dial rep's personal_cell (18s timeout) →
 *   call.answered (outbound leg) →
 *     bridge both legs →
 *   call.hangup (outbound, no answer) →
 *     speak voicemail greeting on inbound + start recording →
 *   recording.saved →
 *     store in rep_voicemails
 *
 * OUTBOUND FLOW (rep dialing out from browser/SIP):
 *   call.initiated / call.answered / call.hangup →
 *     upsert into rep_calls for activity log
 */

const TELNYX_BASE = 'https://api.telnyx.com/v2'
const REP_INBOUND_APP_ID = '2988928027930396604'

type Payload = {
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
  client_state?: string
  recording_urls?: { mp3?: string; wav?: string }
  duration_millis?: number
}

type ClientState = {
  type: 'inbound' | 'outbound' | 'voicemail'
  rep_id?: string
  rep_name?: string
  from_number?: string
  to_number?: string
  inbound_ccc?: string
}

function encodeState(s: ClientState): string {
  return Buffer.from(JSON.stringify(s)).toString('base64')
}

function decodeState(s?: string): ClientState | null {
  if (!s) return null
  try { return JSON.parse(Buffer.from(s, 'base64').toString('utf8')) as ClientState } catch { return null }
}

async function telnyxAction(callControlId: string, action: string, body: Record<string, unknown> = {}) {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return
  try {
    const res = await fetch(`${TELNYX_BASE}/calls/${callControlId}/actions/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      logger.warn(`telnyx action ${action} failed`, { callControlId, status: res.status, body: t.slice(0, 200) })
    }
  } catch (e) {
    logger.warn(`telnyx action ${action} threw`, { callControlId, error: e instanceof Error ? e.message : 'unknown' })
  }
}

async function startVoicemail(inboundCcc: string, repName: string, repId: string, fromNumber: string, toNumber: string) {
  await telnyxAction(inboundCcc, 'speak', {
    payload: `Hi, you've reached ${repName}'s CloudGreet line. Please leave a message and they'll get back to you shortly.`,
    voice: 'female',
    language: 'en-US',
  })
  await telnyxAction(inboundCcc, 'record_start', {
    format: 'mp3',
    channels: 'single',
    client_state: encodeState({ type: 'voicemail', rep_id: repId, from_number: fromNumber, to_number: toNumber }),
  })
}

export async function POST(request: NextRequest) {
  let bodyText = ''
  try { bodyText = await request.text() } catch { return NextResponse.json({ ok: true }) }

  let evt: any
  try { evt = JSON.parse(bodyText) } catch {
    return NextResponse.json({ ok: true, ignored: 'unparseable' })
  }

  const data = evt?.data ?? evt
  const eventType: string = data?.event_type || ''
  const payload: Payload = data?.payload || {}

  const callId = payload.call_control_id || payload.call_session_id || payload.call_leg_id
  const direction = payload.direction
  const fromNumber = payload.from
  const toNumber = payload.to
  const clientState = decodeState(payload.client_state)

  // ── INBOUND: someone called a rep's Telnyx number ─────────────────────────
  if (eventType === 'call.initiated' && direction === 'incoming' && callId) {
    const rep = await findRepByToNumber(toNumber || '')
    if (!rep) {
      return NextResponse.json({ ok: true, ignored: 'no rep for number' })
    }

    await telnyxAction(callId, 'answer', {
      client_state: encodeState({ type: 'inbound', rep_id: rep.id, rep_name: rep.name, from_number: fromNumber, to_number: toNumber }),
    })

    if (!rep.personal_cell) {
      await startVoicemail(callId, rep.name, rep.id, fromNumber || '', toNumber || '')
      return NextResponse.json({ ok: true, action: 'voicemail_no_cell' })
    }

    const apiKey = process.env.TELNYX_API_KEY
    if (apiKey) {
      const dialRes = await fetch(`${TELNYX_BASE}/calls`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: REP_INBOUND_APP_ID,
          to: rep.personal_cell,
          from: toNumber,
          timeout_secs: 18,
          client_state: encodeState({ type: 'outbound', inbound_ccc: callId, rep_id: rep.id, rep_name: rep.name, from_number: fromNumber, to_number: toNumber }),
        }),
      }).catch(e => { logger.warn('telnyx outbound dial threw', { error: e instanceof Error ? e.message : 'unknown' }); return null })

      if (!dialRes || !dialRes.ok) {
        const errBody = dialRes ? await dialRes.text().catch(() => '') : 'fetch failed'
        logger.warn('telnyx outbound dial failed, falling back to voicemail', { status: dialRes?.status, body: errBody.slice(0, 200) })
        await startVoicemail(callId, rep.name, rep.id, fromNumber || '', toNumber || '')
        return NextResponse.json({ ok: true, action: 'voicemail_dial_failed' })
      }
    }

    return NextResponse.json({ ok: true, action: 'forwarding', rep: rep.name })
  }

  // ── OUTBOUND LEG (we created this to forward to rep's cell) ───────────────
  if (clientState?.type === 'outbound') {
    if (eventType === 'call.answered') {
      await telnyxAction(callId!, 'bridge', { call_control_id: clientState.inbound_ccc })
      return NextResponse.json({ ok: true, action: 'bridged' })
    }

    if (eventType === 'call.hangup') {
      const cause = (payload.hangup_cause || '').toLowerCase()
      const source = (payload.hangup_source || '').toLowerCase()
      const wasAnswered = source === 'caller' || source === 'callee' || cause === 'normal_clearing'
      if (!wasAnswered && clientState.inbound_ccc) {
        await startVoicemail(clientState.inbound_ccc, clientState.rep_name || 'the rep', clientState.rep_id || '', clientState.from_number || '', clientState.to_number || '')
        return NextResponse.json({ ok: true, action: 'voicemail' })
      }
      return NextResponse.json({ ok: true, action: 'call_completed' })
    }

    return NextResponse.json({ ok: true, ignored: 'outbound event not tracked', eventType })
  }

  // ── RECORDING SAVED: store voicemail ──────────────────────────────────────
  if (eventType === 'recording.saved' && clientState?.type === 'voicemail') {
    const url = payload.recording_urls?.mp3 || payload.recording_urls?.wav || null
    const dur = payload.duration_millis ? Math.round(payload.duration_millis / 1000) : null
    if (clientState.rep_id && url) {
      const { error: vmErr } = await supabaseAdmin.from('rep_voicemails').insert({
        rep_id: clientState.rep_id,
        from_number: clientState.from_number || null,
        to_number: clientState.to_number || null,
        recording_url: url,
        duration_seconds: dur,
      })
      if (vmErr) logger.warn('rep_voicemails insert failed', { error: vmErr.message })
      logger.info('rep voicemail saved', { repId: clientState.rep_id, dur })
    }
    return NextResponse.json({ ok: true, action: 'voicemail_saved' })
  }

  // ── OUTBOUND (rep dialing a prospect from browser/SIP) ───────────────────
  if (direction && direction !== 'incoming' && !clientState) {
    if (!callId || !fromNumber) return NextResponse.json({ ok: true, ignored: 'no call id or from' })

    const repId = await findRepByFromNumber(fromNumber)
    if (!repId) {
      logger.info('telnyx rep-voice: unrecognised from-number', { fromNumber, eventType, callId })
      return NextResponse.json({ ok: true, ignored: 'unknown rep number' })
    }

    const update = mapEventToUpdate(eventType, payload)
    if (!update) return NextResponse.json({ ok: true, ignored: 'event not tracked', eventType })

    let existing: { id: string; status: string | null } | null = null
    const direct = await supabaseAdmin.from('rep_calls').select('id, status').eq('telnyx_call_id', callId).maybeSingle()
    if ((direct.data as any)?.id) {
      existing = direct.data as any
    } else {
      const sinceIso = new Date(Date.now() - 60_000).toISOString()
      const { data: orphans } = await supabaseAdmin
        .from('rep_calls').select('id, status, telnyx_call_id, started_at')
        .eq('from_number', fromNumber).eq('to_number', payload?.to || '')
        .gte('started_at', sinceIso).order('started_at', { ascending: false }).limit(1)
      const orphan = (orphans || [])[0] as any
      if (orphan?.id) {
        await supabaseAdmin.from('rep_calls').update({ telnyx_call_id: callId }).eq('id', orphan.id)
        existing = { id: orphan.id, status: orphan.status }
      }
    }

    if (existing?.id) {
      if (shouldApplyTransition(existing.status, update.status)) {
        await supabaseAdmin.from('rep_calls').update(update).eq('id', existing.id)
      }
    } else {
      await supabaseAdmin.from('rep_calls').insert({
        rep_id: repId, telnyx_call_id: callId,
        from_number: fromNumber, to_number: payload?.to || null, ...update,
      })
    }

    return NextResponse.json({ ok: true, eventType, callId, repId, status: update.status })
  }

  return NextResponse.json({ ok: true, ignored: 'unhandled', eventType })
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function findRepByToNumber(toNumber: string): Promise<{ id: string; name: string; personal_cell: string | null } | null> {
  const { data } = await supabaseAdmin
    .from('sales_rep_phone_numbers')
    .select('rep_id')
    .eq('phone_number', toNumber)
    .limit(1)
    .maybeSingle()
  const repId = (data as any)?.rep_id
  if (!repId) return null

  const { data: rep } = await supabaseAdmin
    .from('sales_reps')
    .select('id, personal_cell')
    .eq('id', repId)
    .maybeSingle()
  if (!rep) return null

  const { data: user } = await supabaseAdmin
    .from('custom_users')
    .select('first_name, last_name')
    .eq('id', repId)
    .maybeSingle()

  const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'your rep'
  return { id: repId, name, personal_cell: (rep as any).personal_cell || null }
}

async function findRepByFromNumber(fromNumber: string): Promise<string | null> {
  const { data: byMulti } = await supabaseAdmin
    .from('sales_rep_phone_numbers').select('rep_id').eq('phone_number', fromNumber).limit(1).maybeSingle()
  if ((byMulti as any)?.rep_id) return (byMulti as any).rep_id as string

  const { data: byLegacy } = await supabaseAdmin
    .from('sales_reps').select('id').eq('telnyx_outbound_number', fromNumber).limit(1).maybeSingle()
  return (byLegacy as any)?.id || null
}

type CallUpdate = {
  status: 'ringing' | 'in_progress' | 'completed' | 'no_answer' | 'failed'
  started_at?: string
  ended_at?: string
  duration_seconds?: number
}

function mapEventToUpdate(eventType: string, payload: Payload): CallUpdate | null {
  if (eventType === 'call.initiated') {
    return { status: 'ringing', started_at: payload?.start_time || new Date().toISOString() }
  }
  if (eventType === 'call.answered') {
    return { status: 'in_progress', started_at: payload?.start_time || new Date().toISOString() }
  }
  if (eventType === 'call.hangup') {
    const cause = (payload?.hangup_cause || '').toLowerCase()
    const source = (payload?.hangup_source || '').toLowerCase()
    let status: CallUpdate['status'] = 'completed'
    if (cause.includes('no_user_response') || cause.includes('no_answer') || cause.includes('user_busy')) status = 'no_answer'
    else if (cause && !cause.includes('normal_clearing') && !source.includes('caller') && !source.includes('callee')) status = 'failed'
    const startedAt = payload?.start_time ? new Date(payload.start_time).getTime() : null
    const endedAt = payload?.end_time ? new Date(payload.end_time).getTime() : Date.now()
    const dur = startedAt ? Math.max(0, Math.round((endedAt - startedAt) / 1000)) : undefined
    return { status, ended_at: payload?.end_time || new Date().toISOString(), duration_seconds: dur }
  }
  return null
}

function shouldApplyTransition(current: string | null | undefined, next: string): boolean {
  if (!current) return true
  const order: Record<string, number> = { ringing: 1, in_progress: 2, completed: 3, no_answer: 3, failed: 3 }
  return (order[next] ?? 0) >= (order[current] ?? 0)
}
