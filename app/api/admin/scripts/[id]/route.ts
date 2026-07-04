import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    title?: string; body?: string; sort_order?: number
  }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim()
  if (typeof body.body === 'string') update.body = body.body
  if (Number.isFinite(body.sort_order)) update.sort_order = body.sort_order

  const { data, error } = await supabaseAdmin
    .from('dialer_scripts')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, script: data })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin.from('dialer_scripts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
