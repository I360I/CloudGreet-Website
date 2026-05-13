import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/calls
 * Cross-tenant call feed for the admin /admin/calls page.
 * Query params:
 *  - limit (default 50, max 200)
 *  - offset (default 0)
 *  - business_id (optional filter)
 *  - status (optional filter)
 *  - q (optional search across caller name / from_number)
 */
export async function GET(request: NextRequest) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') || '50')))
  const offset = Math.max(0, parseInt(sp.get('offset') || '0'))
  const businessId = sp.get('business_id') || ''
  const status = sp.get('status') || ''
  const q = (sp.get('q') || '').trim()

  let query = supabaseAdmin
   .from('calls')
   .select(
    'id, retell_call_id, business_id, from_number, to_number, caller_name, status, duration, recording_url, transcript, sentiment, call_summary, outcome, created_at',
    { count: 'exact' },
   )
   .order('created_at', { ascending: false })
   .range(offset, offset + limit - 1)

  if (businessId) query = query.eq('business_id', businessId)
  if (status) query = query.eq('status', status)
  if (q) query = query.or(`caller_name.ilike.%${q}%,from_number.ilike.%${q}%`)

  const { data: calls, count, error } = await query
  if (error) {
   logger.error('Admin calls query failed', { error: error.message })
   return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 })
  }

  // Resolve business names in one extra query (avoids N+1 in the page).
  const ids = Array.from(new Set((calls || []).map((c) => c.business_id).filter(Boolean)))
  let nameByBiz: Record<string, string> = {}
  if (ids.length > 0) {
   const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name')
    .in('id', ids)
   nameByBiz = Object.fromEntries((businesses || []).map((b) => [b.id, b.business_name]))
  }

  const enriched = (calls || []).map((c) => ({
   ...c,
   business_name: nameByBiz[c.business_id] || '-',
  }))

  return NextResponse.json({
   success: true,
   total: count || 0,
   limit,
   offset,
   calls: enriched,
  }, {
   headers: { 'cache-control': 'no-store, no-cache, must-revalidate' },
  })
 } catch (e) {
  logger.error('Admin calls failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 })
 }
}
