/**
 * Per-client scenario generator.
 *
 * The canned scenario bank (banks/scenarios/*.json) is hard-coded for
 * service contractors - emergency-gas-leak, prior-bad-work, fake-urgency,
 * etc. Useful for a general regression suite, but for a rideshare or
 * restaurant business, half those scenarios test responsibilities the
 * agent doesn't even have.
 *
 * This module asks Claude to read the live agent prompt + business row
 * and fabricate N realistic caller scenarios tailored to THIS business.
 * Same downstream pipeline (simulate -> score) - only the inputs change.
 *
 * Returns ScenarioFixture[] in the same shape the bank produces, so the
 * matrix builder treats them identically.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { BusinessFixture, ScenarioFixture } from './types'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `You are building a regression test suite for an AI voice receptionist.

Given:
  - the agent's LIVE system prompt
  - the business's profile

Produce N realistic caller scenarios THIS specific business actually receives. Each scenario should probe a different responsibility the agent has, and together they should cover the agent's full job.

For EACH scenario emit a JSON object with exactly these fields:
  id           kebab-case slug, unique
  label        human-readable name (under 60 chars)
  persona      one paragraph instruction to the caller actor: who they are, why they're calling, mood, any obstacles, what they will/won't agree to. WRITE IT AS IF DIRECTING AN ACTOR.
  opening_line first thing the caller says after the agent's greeting. Realistic phone-speak (incomplete sentences, hesitation OK).
  expectations object with:
    must_call      array of tool names the agent SHOULD call. Use one or more of: book_appointment, send_booking_sms, lookup_availability, transfer_call, send_dispatch_request. Omit if no tool is required.
    must_not_call  array of tools the agent must NOT call (e.g. book_appointment when send_dispatch_request is right). Omit if no constraint.
    checks         array of plain-English assertions for the rubric ("agent confirmed pickup address out loud", "agent did not promise a fare", "agent ended call cleanly when caller said bye"). 3-6 entries.

Coverage rules:
  - Make scenarios DIVERSE. No two scenarios should test the same agent skill.
  - At least one happy-path booking/dispatch.
  - At least one edge case the prompt explicitly addresses (read the prompt - look for forbidden behaviors, EMERGENCY_DEFINITION, edge_cases, special rules).
  - At least one HOSTILE caller (prompt injection, abusive, demanding, rude).
  - At least one CONFUSING caller (rambling, off-topic, switches mid-thought).
  - At least one scenario that tests whether the agent uses send_dispatch_request vs book_appointment correctly (if dispatch_mode is on for this business - check the prompt for mentions of dispatch / right-now requests).
  - Match the BUSINESS DOMAIN: rideshare callers ask about pickups/drop-offs; restaurants get reservation calls; service contractors get repair calls. Don't write HVAC scenarios for a law firm.

Output FORMAT: a JSON array of N scenarios. No surrounding prose, no markdown fences. Just the array.`

export async function generateScenariosForClient(
  client: Anthropic,
  business: BusinessFixture,
  count: number,
): Promise<{ scenarios: ScenarioFixture[]; cost_micro: number }> {
  const livePrompt = business.live_prompt || '(no live prompt available - using generated fallback)'
  const ctx = business.context.business
  const profileLines = [
    `business_name: ${ctx.name}`,
    `category: ${(ctx.categories || []).join(', ') || 'unknown'}`,
    `service_area: ${(ctx.service_area || []).join(', ') || 'unknown'}`,
    `address: ${ctx.address || 'unknown'}`,
    `offered services: ${(business.context.services?.offered || []).join(', ') || 'unknown'}`,
    `raw notes: ${(business.context.services?.raw_hints || []).join(' | ') || 'none'}`,
  ].join('\n')

  const userMsg = `BUSINESS PROFILE:
${profileLines}

LIVE AGENT SYSTEM PROMPT:
${livePrompt}

Produce ${count} scenarios as a JSON array.`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  })

  const text = (resp.content.find((b: any) => b.type === 'text') as any)?.text || ''
  const json = extractJsonArray(text)
  if (!json) {
    throw new Error('Scenario generator returned non-JSON. First 200 chars: ' + text.slice(0, 200))
  }

  let parsed: any[]
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    throw new Error('Scenario generator JSON parse failed: ' + (e instanceof Error ? e.message : String(e)))
  }
  if (!Array.isArray(parsed)) throw new Error('Generator did not return an array')

  const scenarios: ScenarioFixture[] = []
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue
    const id = String(raw.id || '').trim()
    const label = String(raw.label || '').trim()
    const persona = String(raw.persona || '').trim()
    const opening_line = String(raw.opening_line || '').trim()
    if (!id || !persona || !opening_line) continue
    const exp = raw.expectations || {}
    scenarios.push({
      id,
      label: label || id,
      persona,
      opening_line,
      expectations: {
        must_call: Array.isArray(exp.must_call) ? exp.must_call : undefined,
        must_not_call: Array.isArray(exp.must_not_call) ? exp.must_not_call : undefined,
        checks: Array.isArray(exp.checks) ? exp.checks : undefined,
      },
    })
  }

  if (scenarios.length === 0) {
    throw new Error('Generator returned 0 valid scenarios after validation')
  }

  // Rough cost: Sonnet 4.6 input $3/MTok, output $15/MTok.
  const usage = resp.usage as any
  const inTok = usage?.input_tokens || 0
  const outTok = usage?.output_tokens || 0
  const cost_micro = Math.round(inTok * 3 + outTok * 15)

  return { scenarios, cost_micro }
}

/**
 * Strip markdown fences / surrounding prose and return the JSON array
 * substring. Returns null if no array shape is found.
 */
function extractJsonArray(text: string): string | null {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end < 0 || end <= start) return null
  return text.slice(start, end + 1)
}
