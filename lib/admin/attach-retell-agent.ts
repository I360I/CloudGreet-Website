import { supabaseAdmin } from '../supabase'
import { logger } from '../monitoring'
import { DEFAULT_POST_CALL_FIELDS } from '../retell-default-extractions'
import { retellAgentManager } from '../retell-agent-manager'

/**
 * Bind a Retell agent ID to a CloudGreet business: validates against
 * Retell, stamps businesses.retell_agent_id, mirrors onto ai_agents,
 * pushes the default extraction schema, and wires the standard tool
 * set (book_appointment, lookup_availability, send_booking_sms,
 * end_call, optional transfer_call) onto the agent's LLM.
 *
 * Shared by:
 *   - PUT /api/admin/clients/[id]/retell-agent  (immediate admin link)
 *   - convertCloseToClient  (deferred attachment when the pre-build
 *     workshop set close.retell_agent_id BEFORE the client account
 *     existed - this runs the moment the close is converted)
 *
 * `tools` errors are non-fatal: we return them so the caller can
 * surface to the admin instead of blowing up the whole flow.
 */
export async function attachRetellAgentToBusiness(opts: {
  businessId: string
  agentId: string
}): Promise<{
  ok: true
  agentName: string
  llmId: string | null
  toolsTrace: string[]
  toolsError: string | null
} | { ok: false; error: string; status: number }> {
  const { businessId, agentId } = opts
  const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
  if (!apiKey) return { ok: false, error: 'RETELL_API_KEY is not set', status: 500 }

  const verifyRes = await fetch(
    `https://api.retellai.com/get-agent/${encodeURIComponent(agentId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  )
  if (!verifyRes.ok) {
    const text = await verifyRes.text().catch(() => verifyRes.statusText)
    return {
      ok: false,
      error: `Retell didn't recognize that agent: ${verifyRes.status} ${text.slice(0, 200)}`,
      status: 400,
    }
  }
  const agent = await verifyRes.json().catch(() => ({} as any))
  const agentName = (agent?.agent_name as string) || 'Retell agent'
  const llmId = agent?.response_engine?.llm_id || null

  // Push default extraction schema (non-fatal).
  try {
    await fetch(`https://api.retellai.com/update-agent/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_call_analysis_data: DEFAULT_POST_CALL_FIELDS }),
    })
  } catch (e) {
    logger.warn('Default extraction schema push failed (non-fatal)', {
      businessId, error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  const { error: bizErr } = await supabaseAdmin
    .from('businesses')
    .update({ retell_agent_id: agentId, updated_at: new Date().toISOString() })
    .eq('id', businessId)
  if (bizErr) {
    return { ok: false, error: bizErr.message, status: 500 }
  }

  try {
    await supabaseAdmin.from('ai_agents').delete().eq('business_id', businessId)
    await supabaseAdmin.from('ai_agents').insert({
      business_id: businessId,
      retell_agent_id: agentId,
      agent_name: agentName,
      status: 'connected',
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    logger.warn('ai_agents mirror failed (non-fatal)', {
      businessId, error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  let toolsTrace: string[] = []
  let toolsError: string | null = null
  try {
    toolsTrace = await retellAgentManager().ensureLLMToolsForBusiness(businessId)
  } catch (e) {
    toolsError = e instanceof Error ? e.message : 'Unknown'
    logger.warn('ensureLLMToolsForBusiness failed (non-fatal)', {
      businessId, error: toolsError,
    })
  }

  return { ok: true, agentName, llmId, toolsTrace, toolsError }
}
