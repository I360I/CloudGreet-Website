import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'vm-drops'
const MAX_BYTES = 6 * 1024 * 1024 // ~45s of 16kHz mono WAV is ~1.4MB; generous cap
// Cap takes at 45s so playback + hangup fits inside voicemail-drop's
// 60s maxDuration with margin. VM drops should be ~30s anyway.
const MAX_SECONDS = 45

/**
 * POST /api/sales/dialer/vm-recording?seconds=NN
 *   body: raw audio/wav bytes (16kHz mono WAV encoded client-side)
 *
 * Stores the rep's personal voicemail-drop recording in the public
 * vm-drops bucket and points custom_users.vm_drop_audio_url at it.
 * The voicemail-drop route prefers this recording over the TTS script.
 *
 * DELETE /api/sales/dialer/vm-recording
 *   Removes the recording (falls back to script/default).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const seconds = Math.round(Number(new URL(request.url).searchParams.get('seconds') || 0))
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > MAX_SECONDS) {
    return NextResponse.json({ error: `Recording must be 1-${MAX_SECONDS} seconds` }, { status: 400 })
  }

  const bytes = await request.arrayBuffer()
  if (bytes.byteLength < 1000) {
    return NextResponse.json({ error: 'Recording is empty' }, { status: 400 })
  }
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Recording too large' }, { status: 413 })
  }

  // Versioned filename so Telnyx / CDN caches never serve a stale take.
  const path = `${auth.userId}-${Date.now()}.wav`
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(bytes), { contentType: 'audio/wav', upsert: true })
  if (upErr) {
    logger.error('vm-recording upload failed', { userId: auth.userId, error: upErr.message })
    return NextResponse.json({
      error: `Upload failed - run sql/vm-drop-recording.sql if the vm-drops bucket is missing. (${upErr.message})`,
    }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  const url = pub.publicUrl

  // Point the user at the new take, then clean up any previous one.
  const { data: prev } = await supabaseAdmin
    .from('custom_users')
    .select('vm_drop_audio_url')
    .eq('id', auth.userId)
    .maybeSingle()
  const { error: dbErr } = await supabaseAdmin
    .from('custom_users')
    .update({ vm_drop_audio_url: url, vm_drop_audio_seconds: seconds })
    .eq('id', auth.userId)
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }
  const prevPath = prev?.vm_drop_audio_url?.split(`/${BUCKET}/`)[1]
  if (prevPath && prevPath !== path) {
    void supabaseAdmin.storage.from(BUCKET).remove([prevPath])
  }

  logger.info('vm-recording saved', { userId: auth.userId, seconds, bytes: bytes.byteLength })
  return NextResponse.json({ success: true, url, seconds })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: prev } = await supabaseAdmin
    .from('custom_users')
    .select('vm_drop_audio_url')
    .eq('id', auth.userId)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('custom_users')
    .update({ vm_drop_audio_url: null, vm_drop_audio_seconds: null })
    .eq('id', auth.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const prevPath = prev?.vm_drop_audio_url?.split(`/${BUCKET}/`)[1]
  if (prevPath) {
    void supabaseAdmin.storage.from(BUCKET).remove([prevPath])
  }

  return NextResponse.json({ success: true })
}
