import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/rep-calls/[id]/recording
 *
 * Admin-only: returns a short-lived playable URL for a call recording.
 * Recordings live in the private call-recordings bucket
 * (recording_url = storage path); we sign it here. Older/fallback rows
 * may hold a raw Telnyx URL instead, which we return as-is.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row } = await supabaseAdmin
    .from('rep_calls')
    .select('recording_url, recording_status')
    .eq('id', params.id)
    .maybeSingle()

  const ref = (row as any)?.recording_url as string | null
  if (!ref) return NextResponse.json({ error: 'No recording for this call' }, { status: 404 })

  // Raw external URL fallback (recording_status 'saved:telnyx-url').
  if (/^https?:\/\//.test(ref)) return NextResponse.json({ success: true, url: ref })

  const { data: signed, error } = await supabaseAdmin.storage
    .from('call-recordings')
    .createSignedUrl(ref, 60 * 60) // 1 hour
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: error?.message || 'Could not sign recording' }, { status: 500 })
  }
  return NextResponse.json({ success: true, url: signed.signedUrl })
}
