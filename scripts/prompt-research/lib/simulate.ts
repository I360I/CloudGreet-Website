/**
 * Run a single (business, scenario) simulation.
 *
 * Two Claude instances:
 *   - the AGENT, system-prompted with the full generated prompt + universal
 *     layer, with the five tools defined.
 *   - the CALLER, system-prompted with the scenario persona.
 *
 * The agent loop follows Anthropic's tool-use pattern: when the agent
 * issues tool_use blocks, we run them, return tool_result blocks, and
 * call the agent AGAIN until it produces a turn with no tool_use (or
 * until it calls end_call / transfer_call). Only then do we mirror its
 * spoken text to the caller and let the caller respond. This avoids
 * the "two consecutive user messages" API error and matches how Retell
 * sequences tool calls in real calls.
 *
 * Stop conditions:
 *   - agent calls end_call
 *   - agent calls transfer_call (we let it say one final line, then stop)
 *   - caller says "bye" / "thanks bye"
 *   - we hit MAX_CALLER_TURNS
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  BusinessFixture,
  ScenarioFixture,
  SimulationResult,
  ToolCallRecord,
  ConversationTurn,
} from './types'

const AGENT_MODEL = 'claude-sonnet-4-6'
const CALLER_MODEL = 'claude-sonnet-4-6'
const MAX_CALLER_TURNS = 14
const MAX_TOOL_LOOPS_PER_TURN = 6

const AGENT_TOOLS = [
  {
    name: 'book_appointment',
    description: 'Books an appointment on the contractor\'s Cal.com calendar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        service: { type: 'string' },
        datetime: { type: 'string', description: 'ISO with timezone' },
        review_consent: { type: 'boolean' },
        is_emergency: { type: 'boolean' },
        address: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['name', 'phone', 'service', 'datetime'],
    },
  },
  {
    name: 'send_booking_sms',
    description: 'Texts the caller a confirmation. MUST be called right after book_appointment returns success.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string' },
        appt_id: { type: 'string' },
      },
      required: ['phone', 'appt_id'],
    },
  },
  {
    name: 'lookup_availability',
    description: 'Returns open slots from the contractor\'s Cal.com.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        duration: { type: 'integer' },
      },
      required: [],
    },
  },
  {
    name: 'transfer_call',
    description: 'Warm-transfer the caller to the owner.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'end_call',
    description: 'End the call.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
]

function pickToolResponse(scenario: ScenarioFixture, toolName: string, args: Record<string, unknown>): unknown {
  const matches = (scenario.tool_mocks || []).filter((m) => m.tool === toolName)
  if (matches.length === 0) {
    if (toolName === 'lookup_availability') return { success: true, slots: ['Tomorrow at 10 AM'] }
    if (toolName === 'book_appointment') return { success: true, appt_id: 'appt_synth_default' }
    if (toolName === 'send_booking_sms') return { success: true }
    if (toolName === 'transfer_call') return { success: true }
    if (toolName === 'end_call') return { success: true }
    return { success: true }
  }
  const argStr = JSON.stringify(args)
  for (const m of matches) {
    if (!m.matchArgs || argStr.includes(m.matchArgs)) return m.response
  }
  return matches[0].response
}

type AgentTurnResult = {
  /** All spoken text emitted across the tool-use loop, joined. */
  spoken: string
  /** True if the agent issued end_call. */
  ended: boolean
  /** True if the agent issued transfer_call. */
  transferred: boolean
}

/**
 * Run the agent until it produces a final response with no tool calls
 * (or terminates with end_call / transfer_call). Mutates `history`,
 * `toolCalls`, `transcript` in place.
 */
async function runAgentTurn(
  client: Anthropic,
  agentPrompt: string,
  history: Anthropic.Messages.MessageParam[],
  toolCalls: ToolCallRecord[],
  transcript: ConversationTurn[],
  scenario: ScenarioFixture,
): Promise<AgentTurnResult> {
  let spokenAll = ''
  for (let loop = 0; loop < MAX_TOOL_LOOPS_PER_TURN; loop++) {
    const resp = await client.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system: agentPrompt,
      tools: AGENT_TOOLS as any,
      messages: history,
    })

    let say = ''
    const toolUses: any[] = []
    for (const block of resp.content) {
      if (block.type === 'text') say += (say ? ' ' : '') + block.text
      if (block.type === 'tool_use') toolUses.push(block)
    }

    history.push({ role: 'assistant', content: resp.content as any })
    if (say.trim()) {
      transcript.push({ role: 'agent', text: say.trim() })
      spokenAll += (spokenAll ? ' ' : '') + say.trim()
    }

    if (toolUses.length === 0) {
      // Final response - no tools to run, return control to the caller.
      return { spoken: spokenAll, ended: false, transferred: false }
    }

    // Run each tool call and feed results back.
    const toolResults: any[] = []
    let ended = false
    let transferred = false
    for (const tu of toolUses) {
      const args = (tu.input || {}) as Record<string, unknown>
      const response = pickToolResponse(scenario, tu.name, args)
      toolCalls.push({ tool: tu.name, args, response })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: typeof response === 'string' ? response : JSON.stringify(response),
      })
      if (tu.name === 'end_call') ended = true
      if (tu.name === 'transfer_call') transferred = true
    }
    history.push({ role: 'user', content: toolResults })

    if (ended) return { spoken: spokenAll, ended: true, transferred: false }
    if (transferred) {
      // Allow one more turn for the agent to say a final line, but cap it.
      const final = await client.messages.create({
        model: AGENT_MODEL,
        max_tokens: 256,
        system: agentPrompt,
        messages: history,
      })
      const finalSay = (final.content.find((b: any) => b.type === 'text') as any)?.text?.trim() || ''
      if (finalSay) {
        transcript.push({ role: 'agent', text: finalSay })
        spokenAll += (spokenAll ? ' ' : '') + finalSay
      }
      return { spoken: spokenAll, ended: false, transferred: true }
    }
    // Otherwise loop again - agent will see the tool_result and decide
    // whether to call more tools or speak.
  }
  // Safety cap hit - return whatever we have.
  return { spoken: spokenAll, ended: false, transferred: false }
}

export async function runSimulation(
  client: Anthropic,
  agentPrompt: string,
  business: BusinessFixture,
  scenario: ScenarioFixture,
): Promise<SimulationResult> {
  const callerSystemPrompt = buildCallerSystemPrompt(business, scenario)
  const toolCalls: ToolCallRecord[] = []
  const transcript: ConversationTurn[] = []

  const agentHistory: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: scenario.opening_line },
  ]
  transcript.push({ role: 'caller', text: scenario.opening_line })

  const callerHistory: Anthropic.Messages.MessageParam[] = []
  let stopReason = 'turn_limit'
  let hitLimit = true

  for (let turn = 0; turn < MAX_CALLER_TURNS; turn++) {
    const agentTurn = await runAgentTurn(client, agentPrompt, agentHistory, toolCalls, transcript, scenario)

    if (agentTurn.ended) { stopReason = 'end_call'; hitLimit = false; break }
    if (agentTurn.transferred) { stopReason = 'transfer_call'; hitLimit = false; break }

    const agentSpoken = agentTurn.spoken || '(...silence...)'
    callerHistory.push({ role: 'user', content: agentSpoken })

    const callerResp = await client.messages.create({
      model: CALLER_MODEL,
      max_tokens: 256,
      system: callerSystemPrompt,
      messages: callerHistory,
    })
    const callerSay = (callerResp.content.find((b: any) => b.type === 'text') as any)?.text?.trim() || ''
    if (!callerSay) { stopReason = 'caller_silent'; hitLimit = false; break }

    callerHistory.push({ role: 'assistant', content: callerSay })
    agentHistory.push({ role: 'user', content: callerSay })
    transcript.push({ role: 'caller', text: callerSay })

    if (/^\s*(bye|thanks?[,!. ]+(bye|talk|have)|see ya|ok bye|alright bye|goodbye)/i.test(callerSay)) {
      stopReason = 'caller_ended'
      hitLimit = false
      break
    }
  }

  return {
    business_id: business.id,
    scenario_id: scenario.id,
    agent_prompt: agentPrompt,
    transcript,
    tool_calls: toolCalls,
    hit_turn_limit: hitLimit,
    stop_reason: stopReason,
  }
}

function buildCallerSystemPrompt(b: BusinessFixture, s: ScenarioFixture): string {
  return [
    'You are role-playing a CALLER on a phone call to a service business.',
    '',
    'IMPORTANT - stay in character. You are NOT an AI assistant in this conversation. You are a real human calling a business. Speak naturally - contractions, partial sentences, "uh", "yeah" are fine. Never break character.',
    '',
    'You do not see the receptionist - you only hear them. Respond to what they say.',
    '',
    `The business you called: ${b.context.business.name} - ${b.label}.`,
    '',
    `Service area: ${(b.context.business.service_area || []).join(', ') || 'unknown'}.`,
    '',
    'Your persona for this call:',
    s.persona,
    '',
    'Keep your responses short (1-3 sentences typical). End with "bye" or "thanks, bye" when you\'re ready to hang up. Don\'t list things, don\'t use markdown, just talk.',
  ].join('\n')
}
