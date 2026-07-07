import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH / DELETE one dialer script entry. Open to reps and setters -
 * the people actually on the phones own the wording; admin keeps the
 * same table at /admin/scripts.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    title?: string; body?: string; sort_order?: number
  }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim().slice(0, 120)
  if (typeof body.body === 'string' && body.body.trim()) update.body = body.body.trim().slice(0, 4000)
  if (body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))) {
    update.sort_order = Math.round(Number(body.sort_order))
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('dialer_scripts')
    .update(update)
    .eq('id', params.id)
    .select('id, section, title, body, sort_order')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Script not found' }, { status: 404 })
  return NextResponse.json({ success: true, script: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('dialer_scripts')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
