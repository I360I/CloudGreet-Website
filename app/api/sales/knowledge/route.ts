import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/knowledge
 *
 * Published knowledge-base articles for the rep tools (setter + sales
 * portals). Admin manages content via /api/admin/knowledge.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('knowledge_articles')
    .select('id, title, body, category, sort_order, updated_at')
    .eq('published', true)
    .order('category')
    .order('sort_order')

  if (error) {
    return NextResponse.json({
      error: `Couldn't load knowledge base - run sql/setter-settings-knowledge.sql if this is the first time. (${error.message})`,
    }, { status: 500 })
  }

  return NextResponse.json({ success: true, articles: data || [] })
}
