import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SECTIONS = new Set(['opener', 'discovery', 'pitch', 'objection', 'closing', 'sms'])

/** GET - all dialer scripts. POST - create one. Admin-only CRUD for
 *  the cockpit's script panel + SMS templates. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('dialer_scripts')
    .select('id, section, title, body, sort_order, updated_at')
    .order('section')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, scripts: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    section?: string; title?: string; body?: string; sort_order?: number
  }
  if (!body.section || !SECTIONS.has(body.section)) {
    return NextResponse.json({ error: `section must be one of: ${Array.from(SECTIONS).join(', ')}` }, { status: 400 })
  }
  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('dialer_scripts')
    .insert({
      section: body.section,
      title: body.title.trim(),
      body: body.body,
      sort_order: Number.isFinite(body.sort_order) ? body.sort_order : 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, script: data })
}
