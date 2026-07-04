import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin CRUD for the rep/setter knowledge base (knowledge_articles).
 * Distinct from /api/admin/knowledge, which manages per-business agent
 * knowledge (business_knowledge_entries). GET returns everything
 * including unpublished drafts; the rep-facing endpoint
 * (/api/sales/knowledge) only serves published rows.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('knowledge_articles')
    .select('id, title, body, category, sort_order, published, updated_at')
    .order('category')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, articles: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    title?: string; body?: string; category?: string; sort_order?: number; published?: boolean
  }
  const title = (body.title || '').trim()
  const text = (body.body || '').trim()
  if (!title || !text) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('knowledge_articles')
    .insert({
      title,
      body: text,
      category: (body.category || 'general').trim().toLowerCase() || 'general',
      sort_order: Number.isFinite(Number(body.sort_order)) ? Math.round(Number(body.sort_order)) : 0,
      published: body.published !== false,
    })
    .select('id, title, body, category, sort_order, published, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, article: data })
}
