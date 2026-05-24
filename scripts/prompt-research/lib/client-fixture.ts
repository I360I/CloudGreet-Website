/**
 * Build a BusinessFixture for a REAL client in the businesses table.
 *
 * This is what makes /admin/quality powerful for production use: instead
 * of only running against the 8 synthetic businesses in banks/, you can
 * point the eval at any actual client and see how the prompt generator
 * handles THEIR data. The pipeline that produces the agent prompt is
 * identical to production (lib/agent-builder/generate.ts), so the score
 * tells you what a real agent built for this client would do.
 *
 * We hit Supabase directly here rather than scraping/Places-lookup, so
 * the test runs in seconds even for clients without a website. If the
 * row's data is sparse the resulting prompt will be sparse too - which
 * is itself useful signal (the generator's behavior on thin inputs).
 */

import { supabaseAdmin } from '@/lib/supabase'
import type { BusinessFixture } from './types'

export async function loadClientFixture(businessId: string): Promise<BusinessFixture> {
  const { data: biz, error } = await supabaseAdmin
    .from('businesses')
    .select(
      'id, business_name, business_type, phone_number, owner_id, retell_agent_id, ' +
      'agent_edge_cases, customization, business_hours, ' +
      'cal_com_event_type_slug, extraction_fields, service_area, ' +
      'address, city, state, zip',
    )
    .eq('id', businessId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load business: ${error.message}`)
  if (!biz) throw new Error(`Business ${businessId} not found`)

  // Pull the live Retell agent's system prompt + begin_message so the
  // eval tests what callers actually hit today. If anything fails (no
  // RETELL_API_KEY, agent doesn't exist, engine isn't retell-llm), we
  // fall back to generating fresh in generateFullPromptForBusiness.
  let livePrompt: string | undefined
  let liveBeginMessage: string | undefined
  const retellAgentId = (biz as any).retell_agent_id as string | null
  const retellKey = process.env.RETELL_API_KEY
  if (retellAgentId && retellKey) {
    try {
      const aRes = await fetch(`https://api.retellai.com/get-agent/${retellAgentId}`, {
        headers: { Authorization: `Bearer ${retellKey}` },
      })
      if (aRes.ok) {
        const agent = await aRes.json() as any
        const begin = agent?.begin_message
        if (typeof begin === 'string' && begin.trim()) liveBeginMessage = begin
        const llmId = agent?.response_engine?.llm_id
        if (agent?.response_engine?.type === 'retell-llm' && llmId) {
          const lRes = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
            headers: { Authorization: `Bearer ${retellKey}` },
          })
          if (lRes.ok) {
            const llm = await lRes.json() as any
            const gp = llm?.general_prompt
            if (typeof gp === 'string' && gp.trim()) livePrompt = gp
            // Begin message can also live on the LLM (newer Retell layouts).
            if (!liveBeginMessage) {
              const bm = llm?.begin_message
              if (typeof bm === 'string' && bm.trim()) liveBeginMessage = bm
            }
          }
        }
      }
    } catch {
      // Network/parsing error - silently fall back to local generation.
    }
  }

  let ownerName: string | undefined
  if ((biz as any).owner_id) {
    const { data: owner } = await supabaseAdmin
      .from('custom_users')
      .select('email, phone, name')
      .eq('id', (biz as any).owner_id)
      .maybeSingle()
    ownerName = (owner as any)?.name || undefined
  }

  const b = biz as any
  const cityState = [b.city, b.state].filter(Boolean).join(', ')
  const fullAddress = [b.address, cityState, b.zip].filter(Boolean).join(', ')

  // Pull whatever services hints exist on the row. The agent-builder
  // accepts both an explicit array and free-form notes - we use both.
  const extraction = b.extraction_fields && typeof b.extraction_fields === 'object'
    ? b.extraction_fields as Record<string, unknown>
    : {}
  const offered: string[] = []
  if (Array.isArray(extraction.services_offered)) {
    for (const s of extraction.services_offered) {
      if (typeof s === 'string' && s.trim()) offered.push(s.trim())
    }
  }
  if (b.business_type && offered.length === 0) offered.push(b.business_type)

  const serviceArea: string[] =
    Array.isArray(b.service_area) ? b.service_area as string[]
    : typeof b.service_area === 'string' ? [b.service_area]
    : cityState ? [cityState]
    : []

  return {
    id: `client-${b.id}`,
    label: `${b.business_name || 'Unnamed business'} (real client)`,
    live_prompt: livePrompt,
    live_begin_message: liveBeginMessage,
    context: {
      business: {
        name: b.business_name || 'Unnamed business',
        owner_name: ownerName,
        phone: b.phone_number || undefined,
        address: fullAddress || undefined,
        website: undefined,
        categories: b.business_type ? [b.business_type] : [],
        service_area: serviceArea.length ? serviceArea : undefined,
        hours: parseHours(b.business_hours),
      },
      services: {
        offered,
        not_offered: Array.isArray(extraction.services_not_offered)
          ? (extraction.services_not_offered as unknown[]).filter((x) => typeof x === 'string') as string[]
          : [],
        raw_hints: b.agent_edge_cases
          ? [`Agent edge cases: ${b.agent_edge_cases.slice(0, 500)}`]
          : [],
      },
      pricing: { displays_pricing: false, notes: [] },
      tone: { formality: 'unknown', review_keywords: [], style_notes: [] },
      reviews: { samples: [] },
      sources: {},
      errors: [],
    },
  }
}

function parseHours(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const day = k.toLowerCase().slice(0, 3)
    if (typeof v === 'string') out[day] = v
    else if (v && typeof v === 'object') {
      const o = v as any
      if (o.closed) out[day] = 'Closed'
      else if (o.open && o.close) out[day] = `${o.open} - ${o.close}`
    }
  }
  return Object.keys(out).length ? out : null
}
