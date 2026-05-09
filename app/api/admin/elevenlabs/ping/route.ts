import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { listVoices } from '@/lib/elevenlabs/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/elevenlabs/ping
 *
 * Sanity check: hits ElevenLabs' /voices endpoint with our API key and
 * reports back whether auth works + which voices we can use. Lets the
 * admin confirm ELEVENLABS_API_KEY is set correctly without writing to
 * anything.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hasKey = !!process.env.ELEVENLABS_API_KEY
  if (!hasKey) {
    return NextResponse.json({
      success: false,
      error: 'ELEVENLABS_API_KEY not set in Vercel env',
    }, { status: 503 })
  }

  const r = await listVoices()
  if (!r.ok) {
    return NextResponse.json({
      success: false,
      error: r.error,
      status: r.status,
    }, { status: 502 })
  }

  // Trim to fields the picker needs - their full payload is large.
  const voices = (r.data?.voices || []).map((v) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category,
    preview_url: v.preview_url,
    labels: v.labels,
  }))

  return NextResponse.json({
    success: true,
    voice_count: voices.length,
    voices: voices.slice(0, 50), // first 50 is plenty for the picker
    env: {
      ELEVENLABS_API_KEY: hasKey,
      ELEVENLABS_DEFAULT_VOICE_ID: !!process.env.ELEVENLABS_DEFAULT_VOICE_ID,
      ELEVENLABS_LLM: process.env.ELEVENLABS_LLM || '(unset, will default at create time)',
      ELEVENLABS_WEBHOOK_SECRET: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
    },
  })
}
