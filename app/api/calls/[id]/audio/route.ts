import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/calls/[id]/audio
 *
 * Returns the call recording as audio bytes. We fetch FRESH from Retell
 * on every request (using the stored retell_call_id) instead of relying
 * on whatever recording_url we stamped at call_ended/call_analyzed —
 * Retell's CDN URLs occasionally expire/move and the stored value can
 * be stale by the time the contractor opens the player. Proxying
 * server-side also avoids any browser CORS surprises with Retell's
 * CloudFront origin.
 */
export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const callDbId = params.id
 if (!callDbId) {
  return NextResponse.json({ error: 'Missing call id' }, { status: 400 })
 }

 const { data: call } = await supabaseAdmin
  .from('calls')
  .select('id, retell_call_id, recording_url')
  .eq('id', callDbId)
  .eq('business_id', auth.businessId)
  .maybeSingle()
 if (!call) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
 }

 // Prefer a freshly-fetched URL from Retell; fall back to the stored
 // one if the live fetch fails (network blip, key rotation, etc.).
 let url: string | null = (call as any).recording_url || null
 const retellCallId = (call as any).retell_call_id as string | null
 if (retellCallId) {
  const key = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY || ''
  if (key) {
   try {
    const r = await fetch(`https://api.retellai.com/v2/get-call/${retellCallId}`, {
     headers: { Authorization: `Bearer ${key}` },
    })
    if (r.ok) {
     const j: any = await r.json().catch(() => null)
     const fresh: string | undefined = j?.recording_url
     if (fresh && typeof fresh === 'string') {
      url = fresh
      // Backfill the DB so the calls list export / week-calendar uses
      // a fresher URL next time, without forcing a full re-pull.
      if (fresh !== (call as any).recording_url) {
       await supabaseAdmin
        .from('calls')
        .update({ recording_url: fresh, updated_at: new Date().toISOString() })
        .eq('id', call.id)
      }
     }
    } else {
     logger.info('Retell get-call non-200 in audio proxy', {
      callId: call.id, status: r.status,
     })
    }
   } catch (e) {
    logger.warn('Retell get-call failed in audio proxy', {
     callId: call.id,
     error: e instanceof Error ? e.message : 'Unknown',
    })
   }
  }
 }

 if (!url) {
  return NextResponse.json({ error: 'No recording available yet' }, { status: 404 })
 }

 // Stream the audio bytes back. Inline the Content-Type / Content-Length
 // headers Retell's CDN returns so the <audio> element gets a real
 // duration in the player instead of showing 0:00/0:00.
 try {
  const upstream = await fetch(url)
  if (!upstream.ok) {
   return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 })
  }
  const headers = new Headers()
  const ct = upstream.headers.get('content-type')
  const cl = upstream.headers.get('content-length')
  const ar = upstream.headers.get('accept-ranges')
  if (ct) headers.set('content-type', ct)
  else headers.set('content-type', 'audio/wav')
  if (cl) headers.set('content-length', cl)
  if (ar) headers.set('accept-ranges', ar)
  headers.set('cache-control', 'private, max-age=300')
  return new NextResponse(upstream.body, { status: 200, headers })
 } catch (e) {
  logger.warn('Audio upstream fetch failed', {
   callId: call.id,
   error: e instanceof Error ? e.message : 'Unknown',
  })
  return NextResponse.json({ error: 'Recording fetch failed' }, { status: 502 })
 }
}
