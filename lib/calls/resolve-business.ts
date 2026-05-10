import { supabaseAdmin } from '@/lib/supabase'

/**
 * Resolve which business owns a Retell call. Tries (in order):
 *   1. ai_agents.business_id by retell_agent_id
 *   2. businesses.retell_agent_id (legacy direct mapping)
 *   3. phone_numbers.business_id by to_number (provider='retell')
 *   4. businesses.phone_number by to_number (some clients only have this)
 *
 * Returns null when nothing matches - caller decides whether to log,
 * notify, or quarantine.
 */
export async function resolveCallBusinessId(
  agentId: string | undefined | null,
  toNumber: string | undefined | null,
): Promise<string | null> {
  if (agentId) {
    const { data: agentRow } = await supabaseAdmin
      .from('ai_agents')
      .select('business_id')
      .eq('retell_agent_id', agentId)
      .maybeSingle()
    if (agentRow?.business_id) return agentRow.business_id
    const { data: bizByAgent } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('retell_agent_id', agentId)
      .maybeSingle()
    if (bizByAgent?.id) return bizByAgent.id
  }
  if (toNumber) {
    const { data: byPhone } = await supabaseAdmin
      .from('phone_numbers')
      .select('business_id')
      .eq('phone_number', toNumber)
      .eq('provider', 'retell')
      .maybeSingle()
    if (byPhone?.business_id) return byPhone.business_id
    const { data: byBizPhone } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('phone_number', toNumber)
      .maybeSingle()
    if (byBizPhone?.id) return byBizPhone.id
  }
  return null
}
