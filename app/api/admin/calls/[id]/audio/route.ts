import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/calls/[id]/audio
 *
 * Admin-scoped clone of /api/calls/[id]/audio. Same behavior (refresh
 * recording_url from Retell, stream the bytes back) but without the
 * business_id filter so the admin can listen to recordings on any
 * client's call from /admin/calls. Browsers can't hit Retell's
 * CloudFront URL directly (no CORS, signed URLs can expire), which
 * was leaving the admin player stuck at 0:00/0:00.
 */
export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) {
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
  .maybeSingle()
 if (!call) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
 }

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
      if (fresh !== (call as any).recording_url) {
       await supabaseAdmin
        .from('calls')
        .update({ recording_url: fresh, updated_at: new Date().toISOString() })
        .eq('id', call.id)
      }
     }
    } else {
     logger.info('Retell get-call non-200 in admin audio proxy', {
      callId: call.id, status: r.status,
     })
    }
   } catch (e) {
    logger.warn('Retell get-call failed in admin audio proxy', {
     callId: call.id,
     error: e instanceof Error ? e.message : 'Unknown',
    })
   }
  }
 }

 if (!url) {
  return NextResponse.json({ error: 'No recording available yet' }, { status: 404 })
 }

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
  logger.warn('Admin audio upstream fetch failed', {
   callId: call.id,
   error: e instanceof Error ? e.message : 'Unknown',
  })
  return NextResponse.json({ error: 'Recording fetch failed' }, { status: 502 })
 }
}
