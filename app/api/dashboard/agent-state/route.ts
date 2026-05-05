import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/agent-state
 *
 * Returns the *live* state of the business's Retell agent - voice id,
 * voice speed, begin_message, general_prompt - read straight from
 * Retell's API instead of the local DB. Used by /dashboard/settings
 * to display "this is what your agent is saying right now" instead
 * of "this is what we have in our DB" (which can drift if a save
 * silently failed).
 *
 * Also returns the bound phone numbers so the contractor can confirm
 * which agent answers their calls.
 */

type Voice = {
 voice_id: string
 voice_name?: string | null
 gender?: string | null
 accent?: string | null
}

export async function GET(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 // Resolve the agent id - businesses.retell_agent_id, falling back to ai_agents.
 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('retell_agent_id')
  .eq('id', auth.businessId)
  .maybeSingle()
 let agentId = (biz as any)?.retell_agent_id || null
 if (!agentId) {
  const { data: aa } = await supabaseAdmin
   .from('ai_agents')
   .select('retell_agent_id')
   .eq('business_id', auth.businessId)
   .maybeSingle()
  agentId = aa?.retell_agent_id || null
 }
 if (!agentId) {
  return NextResponse.json({
   success: true,
   linked: false,
   reason: 'No Retell agent linked to this business yet.',
  })
 }

 const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
 if (!apiKey) {
  return NextResponse.json({ success: false, error: 'RETELL_API_KEY missing' }, { status: 500 })
 }

 try {
  // 1) The agent (voice + speed + linked LLM)
  const agentRes = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
   headers: { Authorization: `Bearer ${apiKey}` },
   cache: 'no-store',
  })
  if (!agentRes.ok) {
   const text = await agentRes.text().catch(() => agentRes.statusText)
   return NextResponse.json({
    success: false,
    error: `Retell get-agent ${agentRes.status}: ${text.slice(0, 200)}`,
   }, { status: 502 })
  }
  const agent = await agentRes.json()

  // 2) Voice catalog so we can label the current voice (id → human name)
  const voicesRes = await fetch('https://api.retellai.com/list-voices', {
   headers: { Authorization: `Bearer ${apiKey}` },
   cache: 'no-store',
  })
  const voices = (voicesRes.ok ? (await voicesRes.json().catch(() => [])) : []) as Voice[]
  const voiceMap = new Map<string, Voice>()
  for (const v of (Array.isArray(voices) ? voices : [])) voiceMap.set(v.voice_id, v)
  const currentVoice = voiceMap.get(agent?.voice_id)

  // 3) The LLM (begin_message + general_prompt) when present
  let beginMessage: string | null = null
  let llmId: string | null = null
  if (agent?.response_engine?.type === 'retell-llm' && agent?.response_engine?.llm_id) {
   llmId = agent.response_engine.llm_id
   const llmRes = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
   })
   if (llmRes.ok) {
    const llm = await llmRes.json().catch(() => ({}))
    beginMessage = (llm?.begin_message as string) ?? null
   }
  }

  // 4) Phone numbers bound to this agent
  let boundNumbers: string[] = []
  try {
   const phonesRes = await fetch('https://api.retellai.com/list-phone-numbers', {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
   })
   if (phonesRes.ok) {
    const phones = (await phonesRes.json().catch(() => [])) as any[]
    boundNumbers = (Array.isArray(phones) ? phones : [])
     .filter((p) => p?.inbound_agent_id === agentId || p?.outbound_agent_id === agentId || p?.agent_id === agentId)
     .map((p) => p?.phone_number || p?.phone_number_pretty || '?')
   }
  } catch { /* non-fatal */ }

  return NextResponse.json({
   success: true,
   linked: true,
   agentId,
   llmId,
   responseEngineType: agent?.response_engine?.type ?? null,
   agentName: agent?.agent_name ?? null,
   voiceId: agent?.voice_id ?? null,
   voiceName: currentVoice?.voice_name || agent?.voice_id || null,
   voiceMeta: currentVoice
    ? [currentVoice.gender, currentVoice.accent].filter(Boolean).join(' · ')
    : null,
   voiceSpeed: typeof agent?.voice_speed === 'number' ? agent.voice_speed : null,
   beginMessage,
   boundNumbers,
  })
 } catch (e) {
  return NextResponse.json({
   success: false,
   error: e instanceof Error ? e.message : 'Failed to load agent state',
  }, { status: 500 })
 }
}
