/**
 * Surgical patches to a live Retell agent's general_prompt.
 *
 * The agent prompt is generated once (via generateAgentPrompt) and
 * pushed to Retell at agent creation. For small post-creation edits
 * we don't want to regenerate from scratch - that re-runs Google
 * Places + website scraping, costs ~$0.03, and risks the LLM
 * rewriting other sections.
 *
 * Each patch finds a marker block, replaces just its contents, and
 * pushes the prompt back. If the block doesn't exist yet, the patch
 * prepends one near the top so it's visible to the model early in
 * the system prompt.
 *
 * Markers are HTML-style comments so they survive cleanly through
 * the LLM's training distribution without ever showing up in the
 * voice output (the agent isn't going to speak HTML comments).
 */

import { logger } from './monitoring'
import { supabaseAdmin } from './supabase'

const RETELL_BASE = 'https://api.retellai.com'

type BlockId = 'service_hours'

const MARKERS: Record<BlockId, { start: string; end: string }> = {
  service_hours: {
    start: '<!-- cg:service_hours:start -->',
    end: '<!-- cg:service_hours:end -->',
  },
}

/**
 * Replace (or insert) the service_hours block in the live agent's
 * prompt. Returns ok=true even when the business has no live agent
 * yet - that's a benign no-op, not a failure.
 */
export async function syncServiceHoursToPrompt(args: {
  businessId: string
  serviceHours: string | null
}): Promise<{ ok: boolean; updated?: boolean; reason?: string }> {
  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_retell_api_key' }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('retell_agent_id, business_name')
    .eq('id', args.businessId)
    .maybeSingle()
  const agentId = (biz as any)?.retell_agent_id
  if (!agentId) return { ok: true, updated: false, reason: 'no_agent' }

  // Resolve the LLM id behind the agent. Patching the agent's prompt
  // means patching the LLM's general_prompt - Retell stores them
  // separately and the agent only references the LLM by id.
  const aRes = await fetch(`${RETELL_BASE}/get-agent/${agentId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!aRes.ok) return { ok: false, reason: `get-agent ${aRes.status}` }
  const agent = await aRes.json() as any
  const engine = agent?.response_engine
  if (engine?.type !== 'retell-llm' || !engine?.llm_id) {
    return { ok: false, reason: `engine ${engine?.type || 'unknown'}` }
  }
  const llmId = engine.llm_id

  const lRes = await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!lRes.ok) return { ok: false, reason: `get-llm ${lRes.status}` }
  const llm = await lRes.json() as any
  const current: string = llm?.general_prompt || ''
  if (!current) return { ok: false, reason: 'empty_prompt' }

  const next = upsertBlock(current, 'service_hours', renderServiceHoursBlock(args.serviceHours))
  if (next === current) {
    return { ok: true, updated: false, reason: 'no_change' }
  }

  const pRes = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ general_prompt: next }),
  })
  if (!pRes.ok) {
    const txt = await pRes.text().catch(() => pRes.statusText)
    logger.warn('syncServiceHoursToPrompt: update-retell-llm failed', {
      businessId: args.businessId, llmId, status: pRes.status, body: txt.slice(0, 200),
    })
    return { ok: false, reason: `update-llm ${pRes.status}` }
  }

  logger.info('service_hours synced to live prompt', {
    businessId: args.businessId, llmId, length: args.serviceHours?.length || 0,
  })
  return { ok: true, updated: true }
}

/* ---------- helpers ---------- */

function renderServiceHoursBlock(hours: string | null): string {
  const trimmed = (hours || '').trim()
  if (!trimmed) {
    // Empty content - still leave a single newline between markers so
    // a subsequent re-fill cleanly replaces it without leaving stray
    // whitespace artefacts.
    return ''
  }
  // Plain "BUSINESS HOURS: ..." line. Single paragraph - keeps the
  // injection unobtrusive against the rest of the prompt.
  return `BUSINESS HOURS (use these to answer when-are-you-open and to avoid quoting unavailable times): ${trimmed}`
}

/**
 * Replace the marker block contents if present; otherwise insert a
 * new block near the top of the prompt (right after the first blank
 * line, so it follows the role intro paragraph if there is one, or
 * at the very top if not). Returns the original string unchanged
 * when content matches what's already there.
 */
function upsertBlock(prompt: string, id: BlockId, content: string): string {
  const { start, end } = MARKERS[id]
  const startIdx = prompt.indexOf(start)
  const endIdx = prompt.indexOf(end)

  const newBlock = content
    ? `${start}\n${content}\n${end}`
    : `${start}\n${end}` // empty content => empty block, keeps markers as a future home

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Replace existing block (including any surrounding blank lines).
    const before = prompt.slice(0, startIdx)
    const after = prompt.slice(endIdx + end.length)
    // Normalise: ensure exactly one blank line on each side of the block
    // so we don't accumulate \n\n\n on repeated saves.
    const beforeTrim = before.replace(/\s+$/, '')
    const afterTrim = after.replace(/^\s+/, '')
    const composed = [beforeTrim, newBlock, afterTrim].filter(Boolean).join('\n\n')
    return composed
  }

  // No existing block - insert after the first paragraph break. If no
  // blank line exists in the prompt, prepend at the very top.
  const firstBreak = prompt.indexOf('\n\n')
  if (firstBreak === -1) {
    return `${newBlock}\n\n${prompt}`
  }
  return `${prompt.slice(0, firstBreak)}\n\n${newBlock}\n\n${prompt.slice(firstBreak + 2)}`
}
