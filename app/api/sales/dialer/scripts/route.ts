import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/dialer/scripts
 * Call scripts / objection battle cards / SMS templates for the cockpit.
 * Content is admin-managed in /admin/scripts (dialer_scripts table).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('dialer_scripts')
    .select('id, section, title, body, sort_order')
    .order('section')
    .order('sort_order')

  if (error) {
    // Migration not applied yet - degrade to an empty script panel
    // instead of breaking the whole cockpit.
    return NextResponse.json({ success: true, scripts: [], migration_needed: 'dialer-scripts' })
  }
  return NextResponse.json({ success: true, scripts: data || [] })
}
