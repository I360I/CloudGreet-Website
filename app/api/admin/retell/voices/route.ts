import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/retell/voices
 *
 * Proxies Retell's list-voices endpoint so the admin can pick a voice
 * for a client without us hardcoding (and drifting from) the catalog.
 * Cached briefly per admin request.
 */

type RetellVoice = {
  voice_id: string
  voice_name?: string | null
  provider?: string | null
  accent?: string | null
  gender?: string | null
  age?: string | null
  preview_audio_url?: string | null
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'RETELL_API_KEY is not configured in this deployment.' },
      { status: 500 },
    )
  }

  try {
    const res = await fetch('https://api.retellai.com/list-voices', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `Retell list-voices ${res.status}: ${body.slice(0, 200)}` },
        { status: 502 },
      )
    }
    const data = (await res.json()) as RetellVoice[]
    const voices = (Array.isArray(data) ? data : []).map((v) => ({
      voice_id: v.voice_id,
      voice_name: v.voice_name || v.voice_id,
      provider: v.provider || null,
      accent: v.accent || null,
      gender: v.gender || null,
      preview_audio_url: v.preview_audio_url || null,
    }))
    return NextResponse.json({ success: true, voices })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch voices' },
      { status: 500 },
    )
  }
}
