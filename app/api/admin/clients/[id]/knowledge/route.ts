import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { fetchAgentKnowledgeBases } from '@/lib/retell-knowledge-base'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/clients/[id]/knowledge
 *
 * Read-only inspector. Returns the knowledge bases attached to the
 * client's Retell agent so the admin can verify what facts the AI
 * is working from. Anthony curates KB content directly in Retell;
 * this just surfaces it next to the rest of the client detail.
 */
export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 // Resolve the agent id (businesses first, ai_agents fallback)
 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('retell_agent_id')
  .eq('id', params.id)
  .maybeSingle()
 let agentId = (biz as any)?.retell_agent_id || null
 if (!agentId) {
  const { data: aa } = await supabaseAdmin
   .from('ai_agents')
   .select('retell_agent_id')
   .eq('business_id', params.id)
   .maybeSingle()
  agentId = aa?.retell_agent_id || null
 }
 if (!agentId) {
  return NextResponse.json({
   success: true,
   linked: false,
   reason: 'No Retell agent linked to this client.',
  })
 }

 const result = await fetchAgentKnowledgeBases(agentId)
 if (result.ok === false) {
  return NextResponse.json({
   success: true,
   linked: true,
   agentId,
   bases: [],
   reason: result.reason,
  })
 }
 return NextResponse.json({
  success: true,
  linked: true,
  agentId,
  bases: result.bases,
 })
}
