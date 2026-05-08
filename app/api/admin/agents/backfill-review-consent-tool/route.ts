import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/agents/backfill-review-consent-tool
 *
 * One-shot: walks every business with a Retell agent and adds the
 * review_consent boolean parameter to its book_appointment tool
 * definition. Idempotent - if the parameter is already present, skips.
 *
 * Tools live on the Retell LLM (not the agent itself). For each agent:
 *   1. GET /get-agent/{id}              → response_engine.llm_id
 *   2. GET /get-retell-llm/{id}         → general_tools[]
 *   3. find tool with name='book_appointment'
 *   4. add review_consent to parameters.properties (if missing)
 *   5. PATCH /update-retell-llm/{id}    → updated general_tools
 *
 * Safe-by-design: never removes existing parameters, never modifies
 * other tools, skips agents whose tool schema doesn't match expectations.
 */

const REVIEW_CONSENT_PARAM = {
  type: 'boolean',
  description:
    'True only if the caller explicitly said yes to receiving a follow-up review text after the appointment. Default false. If the caller is hesitant, in a hurry, or it is an emergency, pass false.',
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RETELL_API_KEY not set' }, { status: 500 })

  const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, retell_agent_id')
    .not('retell_agent_id', 'is', null)

  type Status = 'updated' | 'already_present' | 'no_book_appointment_tool' | 'no_llm' | 'unexpected_schema' | 'error'
  const results: Array<{
    business_id: string
    business_name: string | null
    status: Status
    detail?: string
  }> = []

  for (const biz of businesses || []) {
    const businessId = (biz as any).id as string
    const businessName = (biz as any).business_name as string | null
    const agentId = (biz as any).retell_agent_id as string

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
      if (responseEngineType !== 'retell-llm') {
        results.push({ business_id: businessId, business_name: businessName, status: 'no_llm', detail: `engine=${responseEngineType ?? '∅'}` })
        continue
      }
      const llmId: string | null = agent?.response_engine?.llm_id ?? null
      if (!llmId) {
        results.push({ business_id: businessId, business_name: businessName, status: 'no_llm' })
        continue
      }

      // 2) get-retell-llm → general_tools
      const llmRes = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!llmRes.ok) {
        results.push({ business_id: businessId, business_name: businessName, status: 'error', detail: `get-retell-llm ${llmRes.status}` })
        continue
      }
      const llm = await llmRes.json().catch(() => ({}))
      const tools: any[] = Array.isArray(llm?.general_tools) ? llm.general_tools : []

      // 3) find book_appointment
      const toolIdx = tools.findIndex((t) => t?.name === 'book_appointment')
      if (toolIdx === -1) {
        results.push({ business_id: businessId, business_name: businessName, status: 'no_book_appointment_tool' })
        continue
      }
      const tool = tools[toolIdx]

      // Tool params live at tool.parameters (JSON-Schema shape).
      const params = tool?.parameters
      if (!params || typeof params !== 'object') {
        results.push({ business_id: businessId, business_name: businessName, status: 'unexpected_schema', detail: 'no parameters object' })
        continue
      }
      if (!params.properties || typeof params.properties !== 'object') {
        results.push({ business_id: businessId, business_name: businessName, status: 'unexpected_schema', detail: 'no parameters.properties' })
        continue
      }

      // 4) add review_consent if missing
      if (params.properties.review_consent) {
        results.push({ business_id: businessId, business_name: businessName, status: 'already_present' })
        continue
      }

      const newProperties = { ...params.properties, review_consent: REVIEW_CONSENT_PARAM }
      const newParameters = { ...params, properties: newProperties }
      // Don't add review_consent to the required list - it's optional.
      const newTool = { ...tool, parameters: newParameters }
      const newTools = [...tools]
      newTools[toolIdx] = newTool

      // 5) PATCH the LLM
      const patchRes = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ general_tools: newTools }),
      })
      if (!patchRes.ok) {
        const txt = await patchRes.text().catch(() => patchRes.statusText)
        results.push({ business_id: businessId, business_name: businessName, status: 'error', detail: `update-retell-llm ${patchRes.status}: ${txt.slice(0, 120)}` })
        continue
      }

      results.push({ business_id: businessId, business_name: businessName, status: 'updated' })
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
    no_book_appointment_tool: results.filter((r) => r.status === 'no_book_appointment_tool').length,
    no_llm: results.filter((r) => r.status === 'no_llm').length,
    unexpected_schema: results.filter((r) => r.status === 'unexpected_schema').length,
    errors: results.filter((r) => r.status === 'error').length,
  }
  logger.info('review-consent tool backfill complete', summary)

  return NextResponse.json({ success: true, summary, results })
}
