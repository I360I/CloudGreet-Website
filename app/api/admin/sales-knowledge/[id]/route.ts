import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    title?: string; body?: string; category?: string; sort_order?: number; published?: boolean
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim()
  if (typeof body.body === 'string' && body.body.trim()) update.body = body.body.trim()
  if (typeof body.category === 'string' && body.category.trim()) {
    update.category = body.category.trim().toLowerCase()
  }
  if (body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))) {
    update.sort_order = Math.round(Number(body.sort_order))
  }
  if (typeof body.published === 'boolean') update.published = body.published

  const { data, error } = await supabaseAdmin
    .from('knowledge_articles')
    .update(update)
    .eq('id', params.id)
    .select('id, title, body, category, sort_order, published, updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  return NextResponse.json({ success: true, article: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('knowledge_articles')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
