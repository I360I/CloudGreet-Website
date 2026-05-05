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
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: business } = await supabaseAdmin
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

  if (!business) {
    return NextResponse.json({ error: 'Not your client' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    business,
    edge_cases: Array.isArray(business.agent_edge_cases) ? business.agent_edge_cases : [],
  })
}
