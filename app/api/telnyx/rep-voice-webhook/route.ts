import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telnyxAction } from '@/lib/telnyx/call-control'

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
 *     dial rep's personal_cell — do NOT answer yet, caller hears ringback →
 *   call.answered (outbound leg, rep picks up) →
 *     answer inbound + bridge both legs →
 *   call.hangup (outbound, no answer / timeout) →
 *     answer inbound + speak voicemail greeting + start recording →
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

async function startVoicemail(inboundCcc: string, repName: string, repId: string, fromNumber: string, toNumber: string) {
  await telnyxAction(inboundCcc, 'speak', {
    payload: `Hi, you've reached ${repName}'s CloudGreet line. Please leave a message after the tone and they'll get back to you shortly.`,
    voice: 'Polly.Joanna',
    language: 'en-US',
  })
  await telnyxAction(inboundCcc, 'record_start', {
    format: 'mp3',
    channels: 'single',
    play_beep: true,
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
  // Do NOT answer here — caller hears normal ringback while we dial the rep's
  // cell. We answer + bridge only when the rep picks up, or answer + voicemail
  // if they don't. This way the caller experience is identical to a real call.
  if (eventType === 'call.initiated' && direction === 'incoming' && callId) {
    const rep = await findRepByToNumber(toNumber || '')
    if (!rep) {
      return NextResponse.json({ ok: true, ignored: 'no rep for number' })
    }

    if (!rep.personal_cell) {
      // No cell on file — answer and go straight to voicemail
      await telnyxAction(callId, 'answer', {})
      await startVoicemail(callId, rep.name, rep.id, fromNumber || '', toNumber || '')
      await recordInboundOutcome({
        repId: rep.id, fromNumber: fromNumber || '', toNumber: toNumber || '',
        status: 'missed', leftVoicemail: true,
      })
      return NextResponse.json({ ok: true, action: 'voicemail_no_cell' })
    }

    // Dial the rep's cell. Caller keeps hearing ringback until we bridge.
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
        logger.warn('telnyx outbound dial failed, going to voicemail', { status: dialRes?.status, body: errBody.slice(0, 200) })
        await telnyxAction(callId, 'answer', {})
        await startVoicemail(callId, rep.name, rep.id, fromNumber || '', toNumber || '')
        await recordInboundOutcome({
          repId: rep.id, fromNumber: fromNumber || '', toNumber: toNumber || '',
          status: 'missed', leftVoicemail: true,
        })
        return NextResponse.json({ ok: true, action: 'voicemail_dial_failed' })
      }

      logger.info('telnyx rep inbound: dialing cell', { rep: rep.name })
    }

    return NextResponse.json({ ok: true, action: 'ringing_cell', rep: rep.name })
  }

  // ── OUTBOUND LEG (the call we placed to the rep's cell) ───────────────────
  if (clientState?.type === 'outbound') {
    if (eventType === 'call.answered') {
      // Rep picked up — answer the inbound and bridge both legs
      await telnyxAction(clientState.inbound_ccc!, 'answer', {})
      await telnyxAction(callId!, 'bridge', { call_control_id: clientState.inbound_ccc })
      logger.info('telnyx rep inbound: bridged', { rep: clientState.rep_name })
      return NextResponse.json({ ok: true, action: 'bridged' })
    }

    if (eventType === 'call.hangup') {
      const startedAt = payload.start_time ? new Date(payload.start_time).getTime() : null
      const endedAt = payload.end_time ? new Date(payload.end_time).getTime() : Date.now()
      const talkSecs = startedAt ? Math.round((endedAt - startedAt) / 1000) : 0

      if (talkSecs < 5 && clientState.inbound_ccc) {
        // Rep didn't answer — answer the inbound and take a voicemail
        logger.info('telnyx rep inbound: no answer, voicemail', { rep: clientState.rep_name, talkSecs, cause: payload.hangup_cause })
        await telnyxAction(clientState.inbound_ccc, 'answer', {})
        await startVoicemail(clientState.inbound_ccc, clientState.rep_name || 'the rep', clientState.rep_id || '', clientState.from_number || '', clientState.to_number || '')
        if (clientState.rep_id) {
          await recordInboundOutcome({
            repId: clientState.rep_id, fromNumber: clientState.from_number || '', toNumber: clientState.to_number || '',
            status: 'missed', leftVoicemail: true,
          })
        }
        return NextResponse.json({ ok: true, action: 'voicemail' })
      }

      if (clientState.rep_id) {
        await recordInboundOutcome({
          repId: clientState.rep_id, fromNumber: clientState.from_number || '', toNumber: clientState.to_number || '',
          status: 'completed', durationSeconds: talkSecs,
        })
      }
      return NextResponse.json({ ok: true, action: 'call_completed', talkSecs })
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

  // The sales_reps row is OPTIONAL: setters deliberately don't have one
  // (it's the commission/Stripe profile table). Requiring it here made
  // a prospect's return call to a setter's DID get IGNORED entirely -
  // dead air, no voicemail. Fall back to custom_users.personal_cell,
  // and to the voicemail path when no cell is on file anywhere.
  const { data: rep } = await supabaseAdmin
    .from('sales_reps')
    .select('id, personal_cell')
    .eq('id', repId)
    .maybeSingle()

  const { data: user } = await supabaseAdmin
    .from('custom_users')
    .select('first_name, last_name, personal_cell')
    .eq('id', repId)
    .maybeSingle()

  const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'your rep'
  const personalCell = (rep as any)?.personal_cell || (user as any)?.personal_cell || null
  return { id: repId, name, personal_cell: personalCell }
}

/**
 * A missed inbound (no answer / went to voicemail) is the hottest
 * signal a cold lead sends: they called back. Log it as an inbound
 * rep_calls row, and when the caller matches one of this rep's leads,
 * pin the lead by setting follow_up_at = now() + drop a note - the
 * overview/leads "callbacks due" surfacing puts them at the top of the
 * rep's queue automatically.
 */
async function recordInboundOutcome(opts: {
  repId: string
  fromNumber: string
  toNumber: string
  status: 'completed' | 'missed'
  durationSeconds?: number
  leftVoicemail?: boolean
}) {
  try {
    await supabaseAdmin.from('rep_calls').insert({
      rep_id: opts.repId,
      to_number: opts.toNumber,
      from_number: opts.fromNumber,
      direction: 'inbound',
      status: opts.status,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_seconds: opts.durationSeconds ?? 0,
    })
  } catch { /* non-fatal */ }

  if (opts.status !== 'missed' || !opts.fromNumber) return
  try {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, business_name')
      .eq('phone', opts.fromNumber)
      .maybeSingle()
    if (!lead) return
    const { data: assignment } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id')
      .eq('rep_id', opts.repId)
      .eq('lead_id', lead.id)
      .maybeSingle()
    if (!assignment) return
    await supabaseAdmin
      .from('lead_assignments')
      .update({ follow_up_at: new Date().toISOString(), last_touched_at: new Date().toISOString() })
      .eq('rep_id', opts.repId)
      .eq('lead_id', lead.id)
    const when = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
    await supabaseAdmin.from('lead_notes').insert({
      lead_id: lead.id,
      rep_id: opts.repId,
      body: `Called you back at ${when} CT and missed you${opts.leftVoicemail ? ' - left a voicemail' : ''}. Pinned to your queue.`,
    })
    logger.info('inbound return call pinned lead', { leadId: lead.id, repId: opts.repId })
  } catch (e) {
    logger.warn('inbound return-call pin failed', { error: e instanceof Error ? e.message : 'unknown' })
  }
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
  status: 'ringing' | 'active' | 'completed' | 'no_answer' | 'failed'
  started_at?: string
  ended_at?: string
  duration_seconds?: number
}

function mapEventToUpdate(eventType: string, payload: Payload): CallUpdate | null {
  if (eventType === 'call.initiated') {
    return { status: 'ringing', started_at: payload?.start_time || new Date().toISOString() }
  }
  if (eventType === 'call.answered') {
    return { status: 'active', started_at: payload?.start_time || new Date().toISOString() }
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
  const order: Record<string, number> = { ringing: 1, active: 2, in_progress: 2, completed: 3, no_answer: 3, failed: 3 }
  return (order[next] ?? 0) >= (order[current] ?? 0)
}
