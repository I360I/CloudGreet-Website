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

type BlockId = 'service_hours' | 'venue_fees' | 'quick_availability'

const MARKERS: Record<BlockId, { start: string; end: string }> = {
  service_hours: {
    start: '<!-- cg:service_hours:start -->',
    end: '<!-- cg:service_hours:end -->',
  },
  venue_fees: {
    start: '<!-- cg:venue_fees:start -->',
    end: '<!-- cg:venue_fees:end -->',
  },
  quick_availability: {
    start: '<!-- cg:quick_availability:start -->',
    end: '<!-- cg:quick_availability:end -->',
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

/**
 * Sync venue-fee rules into the live Retell agent prompt. Inserts (or
 * replaces) the <!-- cg:venue_fees --> block with a terse rule set the
 * voice agent can follow without making mistakes on the fee math.
 */
export async function syncVenueFeesToPrompt(args: {
  businessId: string
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

  // Fetch the venue list for this business to build the block content.
  const { data: venues } = await supabaseAdmin
    .from('venue_fees')
    .select('venue_name, category, fee_dollars')
    .eq('business_id', args.businessId)
    .order('fee_dollars', { ascending: false })
  if (!venues || venues.length === 0) return { ok: true, updated: false, reason: 'no_venues' }

  const aRes = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!aRes.ok) return { ok: false, reason: `get-agent ${aRes.status}` }
  const agent = await aRes.json() as any
  const engine = agent?.response_engine
  if (engine?.type !== 'retell-llm' || !engine?.llm_id) {
    return { ok: false, reason: `engine ${engine?.type || 'unknown'}` }
  }
  const llmId = engine.llm_id

  const lRes = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!lRes.ok) return { ok: false, reason: `get-llm ${lRes.status}` }
  const llm = await lRes.json() as any
  const current: string = llm?.general_prompt || ''
  if (!current) return { ok: false, reason: 'empty_prompt' }

  const next = upsertBlock(current, 'venue_fees', renderVenueFeesBlock(venues as any[]))
  if (next === current) return { ok: true, updated: false, reason: 'no_change' }

  const pRes = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ general_prompt: next }),
  })
  if (!pRes.ok) {
    const txt = await pRes.text().catch(() => pRes.statusText)
    logger.warn('syncVenueFeesToPrompt: update-retell-llm failed', {
      businessId: args.businessId, llmId, status: pRes.status, body: txt.slice(0, 200),
    })
    return { ok: false, reason: `update-llm ${pRes.status}` }
  }

  logger.info('venue_fees synced to live prompt', { businessId: args.businessId, llmId, count: venues.length })
  return { ok: true, updated: true }
}

/**
 * Sync the quick-availability-check rule into the live Retell agent
 * prompt. Static content (no per-business data), same on every
 * business - lets a caller ask "are you free Thursday at 4:30?" and
 * get a direct answer instead of being forced through the full
 * pickup/name/phone/email intake before the agent ever calls
 * lookup_availability. Mirrors the SMS agent's existing rule that
 * lookup_availability is read-only and can fire freely (lib/sms-agent.ts).
 * Also collapses the redundant back-to-back detail confirmation seen
 * in Steve's 7/19 3:19pm test call (asked twice in a row).
 */
export async function syncQuickAvailabilityToPrompt(args: {
  businessId: string
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

  const next = upsertBlock(current, 'quick_availability', renderQuickAvailabilityBlock())
  if (next === current) return { ok: true, updated: false, reason: 'no_change' }

  const pRes = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ general_prompt: next }),
  })
  if (!pRes.ok) {
    const txt = await pRes.text().catch(() => pRes.statusText)
    logger.warn('syncQuickAvailabilityToPrompt: update-retell-llm failed', {
      businessId: args.businessId, llmId, status: pRes.status, body: txt.slice(0, 200),
    })
    return { ok: false, reason: `update-llm ${pRes.status}` }
  }

  logger.info('quick_availability synced to live prompt', { businessId: args.businessId, llmId })
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

function renderVenueFeesBlock(venues: Array<{ venue_name: string; category: string; fee_dollars: number }>): string {
  if (!venues.length) return ''
  const premiums = venues.filter(v => v.category === 'premium')
  const majors = venues.filter(v => v.category === 'major')
  const standards = venues.filter(v => v.category === 'standard')

  const lines: string[] = [
    'EVENT TRANSPORTATION FEE (conditional - Steve makes the final call; NEVER add it to the quote yourself):',
    '- Before quoting any ride to/from a stadium, arena, theater, concert venue, zoo, convention center, park, golf club, or named event space: call check_venue_fee(destination).',
    '- Quote ONLY the base transportation price from compute_quote. Do NOT add the venue fee to the total.',
    '- If check_venue_fee returned a fee, disclose it right after the quote as a conditional maximum:',
    '  "Please note an additional event transportation fee of up to [fee] dollars may apply, depending on the size, scope, and nature of your event."',
    '- Then offer: "Would you like me to send your event details over to Steve? He\'ll review them and confirm whether the event fee applies before finalizing your quote."',
    '- If they say yes: collect the venue, event date and time, party size, and occasion, then call send_dispatch_request with the notes prefixed "EVENT FEE REVIEW:" including the base quote and the potential fee. Tell them Steve will follow up with the final number.',
    '- If they decline: leave it at the base quote plus the disclosure - do not push.',
    '- ALWAYS say "event transportation fee" — never "surcharge."',
    '- Applies both directions: drop-off TO the venue AND pickup FROM the venue after the event.',
    '- If check_venue_fee returns not_found: quote the standard mileage rate only, no fee mention.',
    '',
    'Known venue tiers (the "up to" cap per venue — always call check_venue_fee to confirm):',
  ]
  if (premiums.length) lines.push(`  Premium ($50): ${premiums.slice(0, 6).map(v => v.venue_name).join(', ')}${premiums.length > 6 ? `, and ${premiums.length - 6} more` : ''}.`)
  if (majors.length) lines.push(`  Major ($25-$35): ${majors.slice(0, 6).map(v => v.venue_name).join(', ')}${majors.length > 6 ? `, and ${majors.length - 6} more` : ''}.`)
  if (standards.length) lines.push(`  Standard ($15): ${standards.slice(0, 6).map(v => v.venue_name).join(', ')}${standards.length > 6 ? `, and ${standards.length - 6} more` : ''}.`)

  return lines.join('\n')
}

function renderQuickAvailabilityBlock(): string {
  return [
    'QUICK AVAILABILITY CHECK (do this FIRST, before collecting any trip details):',
    '- If the caller asks whether a day or time is open - "are you available Thursday at 4:30?", "do you have anything open Friday?" - and has NOT yet given a pickup address, call lookup_availability immediately with just that date. Do NOT ask for pickup address, name, phone, passengers, email, or any other booking detail first.',
    '- Answer directly: "Yes, that time\'s open" or, if not, offer 2-3 nearby open times from the slots returned.',
    '- Only move into collecting pickup, destination, and the rest of the trip details after the caller says they want to book that time.',
    '- Never make a caller sit through a full intake just to find out if a time is free.',
    '',
    'CONFIRM DETAILS ONCE, NOT TWICE:',
    '- Read back pickup, destination, and date/time ONE time in a single sentence ("So that\'s [pickup] to [destination] on [day] at [time] - sound right?").',
    '- Never confirm the same detail again in a separate turn right after the caller already said yes to it.',
    '- If you need a full recap before booking, do it once at the very end, right before calling book_appointment - not once per field as you collect it.',
  ].join('\n')
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
