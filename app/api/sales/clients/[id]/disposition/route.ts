import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// The deal-stage dispositions offered on the client page. A subset of the
// full lead_assignments status set, focused on where a worked account sits.
// (Constraint allows: new/called/voicemail/interested/demo_scheduled/
//  demo_showed/proposal_sent/closed/dead/not_available/not_interested/
//  wrong_dm/do_not_call.)
const ALLOWED = new Set([
  'interested', 'demo_scheduled', 'demo_showed', 'proposal_sent',
  'closed', 'not_interested', 'dead',
])

const last10 = (s?: string | null) => (s || '').replace(/\D/g, '').slice(-10)

/**
 * Disposition on the CLIENT detail page. The client (business) has no hard FK
 * to a lead, so we match the underlying lead by phone (last 10 digits) and
 * read/write THIS rep's lead_assignment for it - so a disposition set here
 * stays in sync with the rep's Leads list.
 */
async function resolveLead(businessId: string, repId: string) {
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('phone_number')
    .eq('id', businessId)
    .maybeSingle()
  const bizDigits = last10((biz as any)?.phone_number)
  if (bizDigits.length !== 10) return { lead: null }

  // Find a lead this rep is assigned to whose phone matches the business.
  const { data: assignments } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id, status, leads!inner(id, phone)')
    .eq('rep_id', repId)
  const match = (assignments || []).find(
    (a: any) => last10(a.leads?.phone) === bizDigits,
  )
  if (match) return { lead: { id: (match as any).lead_id, status: (match as any).status } }

  // No assignment yet - see if a lead exists at all (so a POST can create one).
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, phone')
    .neq('phone', '')
  const found = (lead || []).find((l: any) => last10(l.phone) === bizDigits)
  return { lead: found ? { id: (found as any).id, status: null } : null }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const { lead } = await resolveLead(params.id, auth.userId)
  return NextResponse.json(
    { success: true, status: lead?.status ?? null, lead_id: lead?.id ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as { status?: string }
  const status = String(body?.status || '')
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Invalid disposition' }, { status: 400 })
  }

  const { lead } = await resolveLead(params.id, auth.userId)
  if (!lead) {
    return NextResponse.json({ error: 'No matching lead for this client' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('lead_assignments')
    .upsert({
      lead_id: lead.id,
      rep_id: auth.userId,
      status,
      last_touched_at: new Date().toISOString(),
    }, { onConflict: 'lead_id,rep_id' })
  if (error) {
    logger.warn('client disposition upsert failed', { businessId: params.id, error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, status })
}
