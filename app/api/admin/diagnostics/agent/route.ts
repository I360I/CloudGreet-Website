import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { resolveCallBusinessId } from '@/lib/calls/resolve-business'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/diagnostics/agent?agentId=agent_xxx
 *
 * Dumps everything resolveCallBusinessId would see for a given Retell
 * agent_id. Use this to figure out why a particular agent's call events
 * are landing in the call.unmatched bucket. Returns raw column values
 * (with hex of leading/trailing chars so invisible whitespace shows up).
 */
export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const agentId = request.nextUrl.searchParams.get('agentId')?.trim() || ''
 if (!agentId) return NextResponse.json({ error: 'agentId query param required' }, { status: 400 })

 const aiAgents = await supabaseAdmin
  .from('ai_agents')
  .select('id, business_id, retell_agent_id, phone_number, status')
  .eq('retell_agent_id', agentId)
 const aiAgentsLike = await supabaseAdmin
  .from('ai_agents')
  .select('id, business_id, retell_agent_id')
  .ilike('retell_agent_id', `%${agentId.slice(-8)}%`)
 const bizExact = await supabaseAdmin
  .from('businesses')
  .select('id, business_name, retell_agent_id, phone_number')
  .eq('retell_agent_id', agentId)
 const bizLike = await supabaseAdmin
  .from('businesses')
  .select('id, business_name, retell_agent_id, phone_number')
  .ilike('retell_agent_id', `%${agentId.slice(-8)}%`)

 const resolved = await resolveCallBusinessId(agentId, null)

 return NextResponse.json({
  query: { agentId, agentIdLength: agentId.length },
  resolved,
  ai_agents_exact: { rows: aiAgents.data, error: aiAgents.error?.message || null },
  ai_agents_suffix_match: { rows: aiAgentsLike.data, error: aiAgentsLike.error?.message || null },
  businesses_exact: {
   rows: (bizExact.data || []).map((b: any) => ({
    ...b,
    retell_agent_id_hex: hexInspect(b.retell_agent_id),
   })),
   error: bizExact.error?.message || null,
  },
  businesses_suffix_match: {
   rows: (bizLike.data || []).map((b: any) => ({
    ...b,
    retell_agent_id_hex: hexInspect(b.retell_agent_id),
   })),
   error: bizLike.error?.message || null,
  },
 })
}

function hexInspect(s: string | null): string | null {
 if (!s) return null
 return Array.from(s).map((c) => {
  const code = c.charCodeAt(0)
  if (code < 0x20 || code > 0x7e) return `\\x${code.toString(16).padStart(2, '0')}`
  return c
 }).join('')
}
