import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/cron/save-recordings
 *
 * Safety net for dialer call recordings. The rep-voice-webhook downloads a
 * recording into the private call-recordings bucket on Telnyx's
 * recording.saved event, but Telnyx doesn't always deliver/echo those
 * reliably for our WebRTC-originated calls. This reconciler catches any that
 * slipped through: it finds rep_calls that started recording but never got a
 * recording_url, matches them to the Telnyx recording by call_control_id,
 * downloads the mp3 into the bucket, and stamps the row. Idempotent.
 *
 * Runs on a schedule (vercel.json) and is admin-runnable on demand.
 * Auth: Vercel sets Authorization: Bearer ${CRON_SECRET} / x-vercel-cron.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  if (!isVercelCron && (!cronSecret ? process.env.NODE_ENV === 'production' : authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TELNYX_API_KEY missing' }, { status: 500 })

  // Calls that started recording but never got saved (last 7 days).
  const { data: pending } = await supabaseAdmin
    .from('rep_calls')
    .select('id, rep_id, telnyx_call_id')
    .eq('recording_status', 'recording')
    .is('recording_url', null)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .limit(500)
  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, pending: 0, saved: 0 })
  }

  // Build call_control_id -> mp3 url from Telnyx recordings (recent pages).
  const recMap = new Map<string, string>()
  let page = 1
  for (; page <= 6; page++) {
    const r = await fetch(`https://api.telnyx.com/v2/recordings?page%5Bnumber%5D=${page}&page%5Bsize%5D=250`, {
      headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store',
    })
    if (!r.ok) break
    const d = await r.json()
    const data: any[] = d.data || []
    for (const rec of data) {
      const url = rec.download_urls?.mp3 || rec.download_urls?.wav
      if (rec.call_control_id && url) recMap.set(rec.call_control_id, url)
    }
    if (data.length < 250) break
  }

  let saved = 0, noMatch = 0, failed = 0
  for (const c of pending as any[]) {
    const url = recMap.get(c.telnyx_call_id)
    if (!url) { noMatch++; continue }
    try {
      const audio = await fetch(url)
      if (!audio.ok) throw new Error(`download ${audio.status}`)
      const buf = Buffer.from(await audio.arrayBuffer())
      const path = `${c.rep_id}/${c.id}.mp3`
      const { error: upErr } = await supabaseAdmin.storage
        .from('call-recordings').upload(path, buf, { contentType: 'audio/mpeg', upsert: true })
      if (upErr) throw new Error(upErr.message)
      await supabaseAdmin.from('rep_calls')
        .update({ recording_url: path, recording_status: 'saved' }).eq('id', c.id)
      saved++
    } catch (e) {
      failed++
      logger.warn('save-recordings reconcile failed', { callId: c.id, error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  logger.info('save-recordings reconcile', { pending: pending.length, saved, noMatch, failed })
  return NextResponse.json({ ok: true, pending: pending.length, saved, no_match: noMatch, failed })
}
