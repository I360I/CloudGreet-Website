import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/quality/save-kb  { business_id, content }
 *
 * Persists a pasted knowledge base to business_knowledge_entries so the eval
 * (web AND the laptop CLI) picks it up - loadClientFixture reads that table.
 * Retell doesn't expose KB text via API, so this is how a Retell-only KB
 * becomes available to the eval. Replaces any prior pasted KB for the
 * client (single 'Eval KB (pasted)' row). Empty content clears it.
 */
const TITLE = 'Eval KB (pasted)'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { business_id?: string; content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const businessId = (body.business_id || '').trim()
  const content = (body.content || '').trim()
  if (!businessId) {
    return NextResponse.json({ error: 'business_id required' }, { status: 400 })
  }

  try {
    // Replace any prior pasted KB so re-saving doesn't accumulate.
    await supabaseAdmin
      .from('business_knowledge_entries')
      .delete()
      .eq('business_id', businessId)
      .eq('title', TITLE)

    if (content) {
      const { error } = await supabaseAdmin.from('business_knowledge_entries').insert({
        business_id: businessId,
        title: TITLE,
        content,
        created_by: auth.userId || null,
      })
      if (error) {
        logger.error('save-kb insert failed', { businessId, error: error.message })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, saved_chars: content.length, cleared: content.length === 0 })
  } catch (e) {
    logger.error('save-kb failed', { businessId, error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
