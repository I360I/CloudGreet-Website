import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

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

  // Validate against Retell so a typo can't be saved.
  const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
  if (!apiKey) {
   return NextResponse.json(
    { error: 'RETELL_API_KEY is not set in this deployment.' },
    { status: 500 },
   )
  }

  const verifyRes = await fetch(`https://api.retellai.com/get-agent/${encodeURIComponent(raw)}`, {
   headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!verifyRes.ok) {
   const text = await verifyRes.text().catch(() => verifyRes.statusText)
   return NextResponse.json(
    {
     error: `Retell didn't recognize that agent: ${verifyRes.status} ${text.slice(0, 200)}`,
    },
    { status: 400 },
   )
  }
  const agent = await verifyRes.json().catch(() => ({} as any))
  const agentName = (agent?.agent_name as string) || 'Retell agent'
  const llmId = agent?.response_engine?.llm_id || null

  // Save canonical column on businesses.
  const { error: bizErr } = await supabaseAdmin
   .from('businesses')
   .update({ retell_agent_id: raw, updated_at: new Date().toISOString() })
   .eq('id', params.id)
  if (bizErr) {
   logger.error('Failed to save retell_agent_id on businesses', {
    clientId: params.id, error: bizErr.message,
   })
   return NextResponse.json({ error: bizErr.message }, { status: 500 })
  }

  // Mirror onto ai_agents so legacy paths still resolve. Best-effort —
  // if the table doesn't exist or upsert fails we don't block the save.
  try {
   await supabaseAdmin
    .from('ai_agents')
    .upsert(
     {
      business_id: params.id,
      retell_agent_id: raw,
      agent_name: agentName,
      status: 'connected',
      updated_at: new Date().toISOString(),
     },
     { onConflict: 'business_id' },
    )
  } catch (e) {
   logger.warn('ai_agents mirror failed (non-fatal)', {
    clientId: params.id, error: e instanceof Error ? e.message : 'Unknown',
   })
  }

  return NextResponse.json({
   success: true,
   agentId: raw,
   agentName,
   llmId,
  })
 } catch (e) {
  logger.error('Retell agent save failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to save agent id' }, { status: 500 })
 }
}
