import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/clients
 *
 * Lists every business this rep brought in. Tolerant of the
 * agent_edge_cases column not existing yet — falls back to a
 * narrower select and reports migration_needed: 'agent-edge-cases'
 * so the UI can prompt for the migration.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  let migrationNeeded: string | null = null

  let { data, error } = await supabaseAdmin
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

  if (error && /column.*does not exist|could not find/i.test(error.message)) {
    migrationNeeded = 'agent-edge-cases'
    const fallback = await supabaseAdmin
      .from('businesses')
      .select(`
        id, business_name, business_type, phone_number,
        monthly_price_cents, setup_fee_cents,
        subscription_status, account_status,
        retell_agent_id, created_at
      `)
      .eq('rep_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(500)
    data = fallback.data as any
    error = fallback.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    clients: (data || []).map((b: any) => ({
      ...b,
      agent_edge_cases: b.agent_edge_cases ?? [],
      edge_case_count: Array.isArray(b.agent_edge_cases) ? b.agent_edge_cases.length : 0,
    })),
    ...(migrationNeeded ? { migration_needed: migrationNeeded } : {}),
  })
}
