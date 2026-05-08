import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import {
  RETURNING_CALLER_START,
  spliceReturningCallerIntoPrompt,
} from '@/lib/smart-ai-prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/agents/backfill-returning-caller
 *
 * One-shot: walks every business that has a Retell agent and pushes the
 * returning-caller prompt block into its general_prompt. Idempotent -
 * if the block is already present, the splicer leaves the prompt
 * unchanged.
 *
 * Run this after the dynamic_variables wiring ships to bring existing
 * contractors onto the new behavior. New agents pick it up automatically
 * via retell-agent-manager.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RETELL_API_KEY not set' }, { status: 500 })

  const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, retell_agent_id')
    .not('retell_agent_id', 'is', null)

  const results: Array<{
    business_id: string
    business_name: string | null
    status: 'updated' | 'already_present' | 'skipped' | 'error'
    detail?: string
  }> = []

  for (const biz of businesses || []) {
    const agentId = (biz as any).retell_agent_id as string
    const businessId = (biz as any).id as string
    const businessName = (biz as any).business_name as string | null

    try {
      // 1) get-agent → llm_id
      const agentRes = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!agentRes.ok) {
        results.push({ business_id: businessId, business_name: businessName, status: 'error', detail: `get-agent ${agentRes.status}` })
        continue
      }
      const agent = await agentRes.json().catch(() => ({}))
      const responseEngineType: string | null = agent?.response_engine?.type ?? null
      const llmId: string | null = responseEngineType === 'retell-llm'
        ? (agent?.response_engine?.llm_id ?? null)
        : null

      if (!llmId) {
        results.push({ business_id: businessId, business_name: businessName, status: 'skipped', detail: `no retell-llm (engine=${responseEngineType ?? '∅'})` })
        continue
      }

      // 2) get-retell-llm → current general_prompt
      const llmRes = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!llmRes.ok) {
        results.push({ business_id: businessId, business_name: businessName, status: 'error', detail: `get-retell-llm ${llmRes.status}` })
        continue
      }
      const llmJson = await llmRes.json().catch(() => ({}))
      const currentPrompt: string = llmJson?.general_prompt || ''
      if (!currentPrompt) {
        results.push({ business_id: businessId, business_name: businessName, status: 'skipped', detail: 'empty prompt' })
        continue
      }

      const alreadyPresent = currentPrompt.includes(RETURNING_CALLER_START)
      const newPrompt = spliceReturningCallerIntoPrompt(currentPrompt)
      if (alreadyPresent && newPrompt === currentPrompt) {
        results.push({ business_id: businessId, business_name: businessName, status: 'already_present' })
        continue
      }

      // 3) PATCH the LLM with the new prompt
      const patchRes = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ general_prompt: newPrompt }),
      })
      if (!patchRes.ok) {
        const txt = await patchRes.text().catch(() => patchRes.statusText)
        results.push({ business_id: businessId, business_name: businessName, status: 'error', detail: `update-retell-llm ${patchRes.status}: ${txt.slice(0, 120)}` })
        continue
      }
      results.push({ business_id: businessId, business_name: businessName, status: alreadyPresent ? 'updated' : 'updated' })
    } catch (e) {
      results.push({
        business_id: businessId,
        business_name: businessName,
        status: 'error',
        detail: e instanceof Error ? e.message : 'Unknown',
      })
    }
  }

  const summary = {
    total: results.length,
    updated: results.filter((r) => r.status === 'updated').length,
    already_present: results.filter((r) => r.status === 'already_present').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
  }
  logger.info('returning-caller backfill complete', summary)

  return NextResponse.json({ success: true, summary, results })
}
