import { NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const checks: Record<string, unknown> = {
      env: {
        SUPABASE: isSupabaseConfigured(),
        RETELL_API_KEY: !!(process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY),
        TELNYX_API_KEY: !!(process.env.TELNYX_API_KEY || process.env.TELYNX_API_KEY),
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL
      }
    }

    // DB check
    try {
      const { data, error } = await supabaseAdmin.rpc('now')
      checks.database = { ok: !error, now: data || null }
    } catch (e) {
      checks.database = { ok: false, error: (e as Error).message }
    }

    const ok =
      checks.env &&
      (checks.env as any).SUPABASE &&
      (checks.env as any).RETELL_API_KEY &&
      (checks.env as any).OPENAI_API_KEY

    return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 })
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message })
    return NextResponse.json({ ok: false, error: 'health_failed' }, { status: 500 })
  }
}











