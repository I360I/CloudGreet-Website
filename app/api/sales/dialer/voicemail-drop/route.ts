import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { telnyxAction } from '@/lib/telnyx/call-control'
import { DEFAULT_VM_SCRIPT } from '@/lib/telnyx/vm-script'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Vercel freezes/terminates the function the instant a response is sent,
// so the speak->wait->hangup sequence has to be awaited inline rather
// than scheduled with a bare setTimeout (which would never fire).
export const maxDuration = 30

// Rough speaking-rate estimate (~150 wpm) so the auto-hangup fires only
// after the script has actually finished playing, not mid-sentence.
const speakMs = (script: string) =>
  Math.round((script.split(/\s+/).length / 150) * 60_000) + 1500

/**
 * POST /api/sales/dialer/voicemail-drop
 *   body: { call_row_id }
 *
 * Manual voicemail drop for the outbound dialer. Telnyx's Answering
 * Machine Detection only runs at call origination (POST /v2/calls) or
 * on a transfer-to-new-destination - there's no action to switch AMD on
 * for an already-answered WebRTC-originated leg, so this is rep-triggered
 * rather than automatic: the rep hears voicemail, clicks the button, we
 * speak the script and hang up for them.
 *
 * Looks up telnyx_call_id from OUR OWN rep_calls row rather than trusting
 * a call_control_id passed by the client - the rep-voice-webhook rewrites
 * that column to the authoritative Telnyx id once call.answered fires
 * (see app/api/telnyx/rep-voice-webhook/route.ts's orphan-matching), so
 * reading it fresh here is more reliable than whatever id the WebRTC SDK
 * exposed at dial time.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { call_row_id?: string }
  const callRowId = (body.call_row_id || '').trim()
  if (!callRowId) return NextResponse.json({ error: 'call_row_id required' }, { status: 400 })

  const { data: row, error } = await supabaseAdmin
    .from('rep_calls')
    .select('id, telnyx_call_id, lead_id')
    .eq('id', callRowId)
    .eq('rep_id', auth.userId)
    .maybeSingle()
  if (error || !row?.telnyx_call_id) {
    return NextResponse.json({ error: 'Call not found or not yet connected' }, { status: 404 })
  }
  // The engine patches the real call_control_id onto the row at answer
  // time; a bare UUID means that patch didn't land and Call Control
  // would reject the id - fail loud instead of pretending to work.
  if (!row.telnyx_call_id.startsWith('v3:')) {
    return NextResponse.json({
      error: "Call isn't linked to Telnyx call control yet - try again in a second, or hang up manually.",
    }, { status: 409 })
  }

  // Personal script if the rep saved one in Settings, else the default.
  const { data: user } = await supabaseAdmin
    .from('custom_users')
    .select('vm_drop_script')
    .eq('id', auth.userId)
    .maybeSingle()
  const script = (user?.vm_drop_script || '').trim() || DEFAULT_VM_SCRIPT

  const spoke = await telnyxAction(row.telnyx_call_id, 'speak', {
    payload: script,
    voice: 'Polly.Joanna',
    language: 'en-US',
  })
  if (!spoke) {
    return NextResponse.json({
      error: 'Telnyx rejected the voicemail drop - hang up manually.',
    }, { status: 502 })
  }

  // Must await here, not setTimeout-and-return: Vercel freezes the
  // function the moment a response is sent, so a fire-and-forget timer
  // would simply never run.
  await new Promise((resolve) => setTimeout(resolve, speakMs(script)))
  await telnyxAction(row.telnyx_call_id, 'hangup', {})

  logger.info('voicemail drop triggered', { repId: auth.userId, callRowId, leadId: row.lead_id })
  return NextResponse.json({ success: true })
}
