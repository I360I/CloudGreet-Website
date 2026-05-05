import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/clients
 *
 * Lists every business this rep brought in (businesses.rep_id matches).
 * Used by /sales/clients to show the rep's book of business + give them
 * a way to drop into per-client agent editing.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select(`
      id, business_name, business_type, phone_number,
      monthly_price_cents, setup_fee_cents,
      subscription_status, account_status,
      retell_agent_id, agent_edge_cases,
      created_at
    `)
    .eq('rep_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    clients: (data || []).map((b: any) => ({
      ...b,
      edge_case_count: Array.isArray(b.agent_edge_cases) ? b.agent_edge_cases.length : 0,
    })),
  })
}
