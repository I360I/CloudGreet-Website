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
    .select('id, business_id')
    .eq('id', params.closeId)
    .maybeSingle()
  if (closeErr || !close) {
    return NextResponse.json({ error: 'Close not found' }, { status: 404 })
  }
  if (close.business_id) {
    return NextResponse.json({
      error: 'This close already has a business - use /api/admin/clients/[id]/retell-agent so tools get wired immediately.',
    }, { status: 409 })
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

  // Verify against Retell so a typo can't sit on the close until
  // conversion and then blow up the auto-attach.
  const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RETELL_API_KEY is not set' }, { status: 500 })

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

  const { error: upErr } = await supabaseAdmin
    .from('closes')
    .update({ retell_agent_id: raw, updated_at: new Date().toISOString() })
    .eq('id', close.id)
  if (upErr) {
    logger.error('Pre-build agent save failed', { closeId: close.id, error: upErr.message })
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    agentId: raw,
    agentName,
    deferred: true,
    note: 'Agent will auto-attach to the business when the client creates their account.',
  })
}
