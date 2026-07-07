import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BODY = 60_000 // ~15k words - plenty for any call script

/**
 * Full-length call scripts library (call_scripts table).
 * GET  - list everything, newest-updated first (bodies included; the
 *        library is small and the reader needs full text anyway).
 * POST - add one ({ title, body }); uploads land here too after the
 *        client reads the file text.
 * Open to reps + setters - the library is shared team material.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('call_scripts')
    .select('id, title, body, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({
      error: `Couldn't load the script library - run sql/call-scripts-library.sql if this is the first time. (${error.message})`,
    }, { status: 500 })
  }
  return NextResponse.json({ success: true, scripts: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { title?: string; body?: string }
  const title = String(body.title || '').trim().slice(0, 160)
  const text = String(body.body || '').trim().slice(0, MAX_BODY)
  if (!title || !text) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('call_scripts')
    .insert({ title, body: text, created_by: auth.userId })
    .select('id, title, body, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, script: data })
}
