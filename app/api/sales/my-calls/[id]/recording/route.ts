import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/my-calls/[id]/recording
 *
 * Rep-facing twin of the admin recording route: signs a playback URL
 * for ONE of the caller's OWN call recordings (self-coaching). Hard
 * ownership check - the rep_calls row must belong to the caller.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  try {
    const { data: call } = await supabaseAdmin
      .from('rep_calls')
      .select('id, rep_id, recording_url, recording_status')
      .eq('id', params.id)
      .maybeSingle()
    if (!call || call.rep_id !== auth.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!call.recording_url) {
      return NextResponse.json({ error: 'No recording for this call' }, { status: 404 })
    }
    // Bucket-stored recordings are private paths ({rep_id}/{id}.mp3);
    // legacy rows may hold a raw Telnyx URL - pass those through.
    if (/^https?:\/\//i.test(call.recording_url)) {
      return NextResponse.json({ success: true, url: call.recording_url })
    }
    const { data: signed, error } = await supabaseAdmin.storage
      .from('call-recordings')
      .createSignedUrl(call.recording_url, 3600)
    if (error || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Could not sign recording' }, { status: 500 })
    }
    return NextResponse.json({ success: true, url: signed.signedUrl })
  } catch (e) {
    logger.error('my-calls recording failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
