import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { telnyxAction } from '@/lib/telnyx/call-control'
import { canRecordCall } from '@/lib/compliance/call-recording'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

/**
 * POST /api/sales/dialer/record  { call_control_id, lead_id? }
 *
 * Auto-recording, gated by the callee's consent-law state (see
 * lib/compliance/call-recording.ts). Records ONLY in one-party states;
 * silently skips all-party / unknown states. Best-effort: any failure
 * returns 200 with recorded:false and never disrupts the live call.
 * The engine fires this at answer; recording.saved is handled in the
 * rep-voice-webhook and stored to the private call-recordings bucket.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { call_control_id?: string; lead_id?: string }
  const ccid = (body.call_control_id || '').trim()
  if (!ccid || !ccid.startsWith('v3:')) {
    return NextResponse.json({ recorded: false, reason: 'no call-control id' })
  }

  // Resolve the callee state server-side from the lead (never trust the
  // client for the consent decision).
  let leadState: string | null = null
  let leadPhone: string | null = null
  if (body.lead_id) {
    const { data: lead } = await supabaseAdmin
      .from('leads').select('state, phone').eq('id', body.lead_id).maybeSingle()
    leadState = (lead as any)?.state ?? null
    leadPhone = (lead as any)?.phone ?? null
  }
  // Fall back to the rep_calls row's to_number for the area-code check.
  const { data: callRow } = await supabaseAdmin
    .from('rep_calls')
    .select('id, to_number, recording_status')
    .eq('telnyx_call_id', ccid)
    .eq('rep_id', auth.userId)
    .maybeSingle()
  if (!leadPhone) leadPhone = (callRow as any)?.to_number ?? null

  // Idempotency: don't double-start on a call we already acted on.
  if ((callRow as any)?.recording_status) {
    return NextResponse.json({ recorded: false, reason: 'already decided' })
  }

  const decision = canRecordCall(leadState, leadPhone)
  const markStatus = async (status: string) => {
    if ((callRow as any)?.id) {
      await supabaseAdmin.from('rep_calls')
        .update({ recording_status: status, recording_state: decision.state })
        .eq('id', (callRow as any).id)
    }
  }

  if (!decision.record) {
    await markStatus(`skipped:${decision.reason}`)
    return NextResponse.json({ recorded: false, reason: decision.reason, state: decision.state })
  }

  const started = await telnyxAction(ccid, 'record_start', {
    format: 'mp3',
    channels: 'single',
    // client_state tags the recording.saved event as a dialer recording
    // (vs the voicemail-drop recordings) for the webhook to route.
    client_state: Buffer.from(JSON.stringify({ type: 'dialer_recording' })).toString('base64'),
  })

  await markStatus(started ? 'recording' : 'failed')
  if (!started) logger.warn('dialer record_start failed', { repId: auth.userId, ccid })
  return NextResponse.json({ recorded: started, state: decision.state })
}
