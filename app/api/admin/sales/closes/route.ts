import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/sales/closes?status=pending
 *
 * Returns all rep-submitted closes with rep + (optional) business
 * context attached. Used by the admin review screen.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const statusFilter = url.searchParams.get('status')

  try {
    let q = supabaseAdmin
      .from('closes')
      .select(`
        *,
        rep:rep_id ( id, email, first_name, last_name ),
        business:business_id ( id, business_name )
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    if (statusFilter) q = q.eq('status', statusFilter)

    const { data, error } = await q
    if (error) {
      logger.error('Admin list closes failed', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, closes: data ?? [] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 },
    )
  }
}
