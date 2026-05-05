import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/clients/[id]/agent
 *
 * Returns the agent config the rep is allowed to edit for one of
 * their clients. Auth: caller must own the business (businesses.rep_id).
 * Falls back gracefully when the agent_edge_cases column hasn't
 * been added yet.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  let migrationNeeded: string | null = null

  let { data: business, error } = await supabaseAdmin
    .from('businesses')
    .select(`
      id, business_name, business_type, phone_number, email,
      greeting_message, voice_id, voice_speed,
      retell_agent_id, agent_edge_cases,
      subscription_status, account_status,
      cal_com_enabled, cal_com_event_type_uri,
      created_at
    `)
    .eq('id', params.id)
    .eq('rep_id', auth.userId)
    .maybeSingle()

  if (error && /column.*does not exist|could not find/i.test(error.message)) {
    migrationNeeded = 'agent-edge-cases'
    const fallback = await supabaseAdmin
      .from('businesses')
      .select(`
        id, business_name, business_type, phone_number, email,
        greeting_message, voice_id, voice_speed,
        retell_agent_id,
        subscription_status, account_status,
        created_at
      `)
      .eq('id', params.id)
      .eq('rep_id', auth.userId)
      .maybeSingle()
    business = fallback.data as any
    error = fallback.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!business) {
    return NextResponse.json({ error: 'Not your client' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    business,
    edge_cases: Array.isArray((business as any).agent_edge_cases)
      ? (business as any).agent_edge_cases
      : [],
    ...(migrationNeeded ? { migration_needed: migrationNeeded } : {}),
  })
}
