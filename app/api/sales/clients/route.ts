import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/clients
 *
 * Lists every business this rep brought in. Tolerant of the
 * agent_edge_cases column not existing yet - falls back to a
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
      calcom_connected, cal_com_username, cal_com_event_type_slug,
      website, address,
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
        retell_agent_id,
        calcom_connected, cal_com_username, cal_com_event_type_slug,
        website, address,
        created_at
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

  // Fall back to the close's negotiated price when the business row
  // doesn't carry a monthly_price_cents (older clients, or ones
  // provisioned via "Send booking link" before the rep set a price).
  const businessIds = (data || []).map((b: any) => b.id)
  const priceFromClose = new Map<string, { monthly: number; setup: number }>()
  if (businessIds.length > 0) {
    const { data: closes } = await supabaseAdmin
      .from('closes')
      .select('business_id, agreed_monthly_cents, agreed_setup_fee_cents, created_at')
      .eq('rep_id', auth.userId)
      .in('business_id', businessIds)
      .order('created_at', { ascending: false })
    for (const c of closes || []) {
      if (!c.business_id) continue
      // Keep the most-recent close's price (we ordered desc so first
      // entry per business_id wins).
      if (!priceFromClose.has(c.business_id)) {
        priceFromClose.set(c.business_id, {
          monthly: c.agreed_monthly_cents || 0,
          setup: c.agreed_setup_fee_cents || 0,
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    clients: (data || []).map((b: any) => {
      const fallback = priceFromClose.get(b.id)
      return {
        ...b,
        // Use the business's stored price if set; otherwise pick up the
        // negotiated price from the most recent close so reps see the
        // actual quoted amount instead of '-'.
        monthly_price_cents: b.monthly_price_cents ?? (fallback?.monthly || null),
        setup_fee_cents: b.setup_fee_cents ?? (fallback?.setup || null),
        agent_edge_cases: b.agent_edge_cases ?? [],
        edge_case_count: Array.isArray(b.agent_edge_cases) ? b.agent_edge_cases.length : 0,
      }
    }),
    ...(migrationNeeded ? { migration_needed: migrationNeeded } : {}),
  })
}
