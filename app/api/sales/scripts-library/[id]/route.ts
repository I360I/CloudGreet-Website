import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BODY = 60_000

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { title?: string; body?: string; is_primary?: boolean }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim().slice(0, 160)
  if (typeof body.body === 'string' && body.body.trim()) update.body = body.body.trim().slice(0, MAX_BODY)
  if (typeof body.is_primary === 'boolean') {
    // Single primary: the partial unique index enforces it, so demote
    // any current primary before promoting this one.
    if (body.is_primary) {
      await supabaseAdmin.from('call_scripts').update({ is_primary: false }).eq('is_primary', true)
    }
    update.is_primary = body.is_primary
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('call_scripts')
    .update(update)
    .eq('id', params.id)
    .select('id, title, body, is_primary, created_at, updated_at')
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
    .from('call_scripts')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
