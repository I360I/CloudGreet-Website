import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SECTIONS = new Set(['opener', 'discovery', 'pitch', 'objection', 'closing', 'sms'])

/**
 * GET /api/sales/dialer/scripts
 * Call scripts / objection battle cards / SMS templates for the cockpit.
 *
 * POST /api/sales/dialer/scripts  { section, title, body, sort_order? }
 * Reps and setters can add their own entries (the people on the phones
 * know what's landing); admin has the same table at /admin/scripts.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('dialer_scripts')
    .select('id, section, title, body, sort_order')
    .order('section')
    .order('sort_order')

  if (error) {
    // Migration not applied yet - degrade to an empty script panel
    // instead of breaking the whole cockpit.
    return NextResponse.json({ success: true, scripts: [], migration_needed: 'dialer-scripts' })
  }
  return NextResponse.json({ success: true, scripts: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    section?: string; title?: string; body?: string; sort_order?: number
  }
  const section = String(body.section || '').trim()
  const title = String(body.title || '').trim().slice(0, 120)
  const text = String(body.body || '').trim().slice(0, 4000)
  if (!SECTIONS.has(section)) {
    return NextResponse.json({ error: `section must be one of: ${Array.from(SECTIONS).join(', ')}` }, { status: 400 })
  }
  if (!title || !text) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('dialer_scripts')
    .insert({
      section, title, body: text,
      sort_order: Number.isFinite(Number(body.sort_order)) ? Math.round(Number(body.sort_order)) : 99,
    })
    .select('id, section, title, body, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, script: data })
}
