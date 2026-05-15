import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { attachRetellAgentToBusiness } from '@/lib/admin/attach-retell-agent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PUT /api/admin/clients/[id]/retell-agent
 * body: { agentId: string | null }
 *
 * Wires (or unwires) a Retell agent to a CloudGreet client. Sets the
 * id on businesses.retell_agent_id (the canonical column read by all
 * the per-client update flows) and mirrors it onto ai_agents so legacy
 * code paths that only look there keep working.
 *
 * Fetches the agent from Retell to verify it exists before saving so
 * admins can't accidentally save a typo.
 */
export async function PUT(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const body = await request.json().catch(() => null) as { agentId?: string | null } | null
 const raw = (body?.agentId ?? '').toString().trim()

 try {
  // Clear path
  if (!raw) {
   await supabaseAdmin
    .from('businesses')
    .update({ retell_agent_id: null, updated_at: new Date().toISOString() })
    .eq('id', params.id)
   await supabaseAdmin.from('ai_agents').delete().eq('business_id', params.id)
   return NextResponse.json({ success: true, agentId: null })
  }

  const result = await attachRetellAgentToBusiness({ businessId: params.id, agentId: raw })
  if (result.ok === false) {
   return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({
   success: true,
   agentId: raw,
   agentName: result.agentName,
   llmId: result.llmId,
   toolsTrace: result.toolsTrace,
   toolsError: result.toolsError,
  })
 } catch (e) {
  logger.error('Retell agent save failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to save agent id' }, { status: 500 })
 }
}
