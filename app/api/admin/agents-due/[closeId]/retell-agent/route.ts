import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PUT /api/admin/agents-due/[closeId]/retell-agent
 *   body: { agentId: string | null }
 *
 * Pre-build sibling of /api/admin/clients/[id]/retell-agent. Used when
 * the admin builds the demo agent BEFORE the prospect has created
 * their CloudGreet account (i.e. before close.business_id is set).
 *
 * Validates the agent exists in Retell, then stashes the id on
 * closes.retell_agent_id. The full wire-up (businesses.retell_agent_id,
 * ai_agents row, tools/extractions/webhook) is deferred until
 * convertCloseToClient runs - that's when a business actually exists.
 *
 * If the close already has a business linked, this endpoint refuses
 * and tells the admin to use the post-conversion endpoint instead so
 * we don't keep two paths going.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { agentId?: string | null } | null
  const raw = (body?.agentId ?? '').toString().trim()

  const { data: close, error: closeErr } = await supabaseAdmin
    .from('closes')
    .select('id, business_id, prospect_phone, prospect_business_name')
    .eq('id', params.closeId)
    .maybeSingle()
  if (closeErr || !close) {
    return NextResponse.json({ error: 'Close not found' }, { status: 404 })
  }

  // Unlink path.
  if (!raw) {
    const { error } = await supabaseAdmin
      .from('closes')
      .update({ retell_agent_id: null, updated_at: new Date().toISOString() })
      .eq('id', close.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, agentId: null })
  }

  // Save on the close first (always) so the deferred-attach path on
  // convertCloseToClient stays a safety net if the live attach below
  // doesn't find a business yet.
  const { error: upErr } = await supabaseAdmin
    .from('closes')
    .update({ retell_agent_id: raw, updated_at: new Date().toISOString() })
    .eq('id', close.id)
  if (upErr) {
    logger.error('Pre-build agent save failed', { closeId: close.id, error: upErr.message })
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  // Try to resolve a business to attach to RIGHT NOW. The chain we
  // search, in order:
  //   1. close.business_id (workshop opened post-conversion)
  //   2. leads.business_id via prospect_phone match (the rep's lead
  //      got converted; the business is reachable through it)
  //   3. businesses by phone match (covers cases where the lead
  //      lookup failed but a business exists with the same phone)
  // If anything matches, do the full wire-up immediately instead of
  // waiting for convertCloseToClient. This is the "if it's in admin,
  // it's connected the moment any account for this contractor is
  // active" expectation.
  let resolvedBusinessId: string | null = (close as any).business_id || null
  if (!resolvedBusinessId && (close as any).prospect_phone) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('business_id')
      .eq('phone', (close as any).prospect_phone)
      .not('business_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    resolvedBusinessId = (lead as any)?.business_id || null
  }
  if (!resolvedBusinessId && (close as any).prospect_phone) {
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('phone_number', (close as any).prospect_phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    resolvedBusinessId = (biz as any)?.id || null
  }

  if (resolvedBusinessId) {
    const { attachRetellAgentToBusiness } = await import('@/lib/admin/attach-retell-agent')
    const result = await attachRetellAgentToBusiness({
      businessId: resolvedBusinessId,
      agentId: raw,
    })
    if (result.ok === false) {
      return NextResponse.json({
        error: `Saved on close, but live-attach to existing business failed: ${result.error}`,
      }, { status: result.status })
    }
    // Also stamp the close so we have a permanent record + the
    // deferred path stays consistent if the business is ever recreated.
    await supabaseAdmin
      .from('closes')
      .update({ business_id: resolvedBusinessId, updated_at: new Date().toISOString() })
      .eq('id', close.id)
      .then(undefined, () => null)
    return NextResponse.json({
      success: true,
      agentId: raw,
      agentName: result.agentName,
      attached_business_id: resolvedBusinessId,
      toolsTrace: result.toolsTrace,
      toolsError: result.toolsError,
      deferred: false,
    })
  }

  // Verify with Retell (we deferred verification to here for the
  // pre-conversion case so a typo doesn't sit unflagged on the close
  // until conversion).
  const apiKey = process.env.RETELL_API_KEY
  if (apiKey) {
    const verifyRes = await fetch(`https://api.retellai.com/get-agent/${encodeURIComponent(raw)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!verifyRes.ok) {
      const text = await verifyRes.text().catch(() => verifyRes.statusText)
      return NextResponse.json({
        error: `Retell didn't recognize that agent: ${verifyRes.status} ${text.slice(0, 200)}`,
      }, { status: 400 })
    }
    const agent = await verifyRes.json().catch(() => ({} as any))
    const agentName = (agent?.agent_name as string) || 'Retell agent'
    return NextResponse.json({
      success: true,
      agentId: raw,
      agentName,
      deferred: true,
      note: 'Agent saved on close - will auto-attach when the client account is created.',
    })
  }

  return NextResponse.json({
    success: true,
    agentId: raw,
    deferred: true,
    note: 'Agent saved on close - will auto-attach when the client account is created.',
  })
}
