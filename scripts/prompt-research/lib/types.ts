/**
 * Shared types for the prompt-research harness.
 *
 * The "business" type intentionally mirrors lib/agent-builder/build-context.ts
 * so synthetic JSONs can flow straight into generateAgentPrompt() with no
 * adapter layer. Scenarios + scoring are local-only.
 */

import type { BusinessContext } from '../../../lib/agent-builder/build-context'

export type BusinessFixture = {
  id: string
  label: string
  context: BusinessContext
  /**
   * Optional: when set, the eval uses this prompt verbatim and skips
   * generateAgentPrompt(). Populated for mode='client' so we test the
   * exact prompt deployed on the live Retell agent, not what the
   * generator would produce right now (they can drift if admin edited
   * the prompt directly or the generator changed since wiring).
   */
  live_prompt?: string
  /** Optional: the agent's deployed begin_message (Retell greeting). */
  live_begin_message?: string
}

/**
 * A canned response the harness returns when the agent calls a tool.
 *
 * "match" — string prefix the tool name + arg JSON must include for this
 * response to be selected. If multiple match, the first wins. If none
 * match, the harness returns a generic success so the conversation
 * doesn't deadlock.
 */
export type ToolMock = {
  tool: 'book_appointment' | 'send_booking_sms' | 'lookup_availability' | 'transfer_call' | 'send_dispatch_request' | 'end_call'
  /** Optional substring filter on the JSON-stringified args. */

  matchArgs?: string
  response: Record<string, unknown> | string
}

export type ScenarioExpectation = {
  /** Tool calls the agent MUST make for this scenario to pass. */
  must_call?: Array<'book_appointment' | 'send_booking_sms' | 'lookup_availability' | 'transfer_call'>
  /** Tool calls the agent must NOT make. */
  must_not_call?: Array<'book_appointment' | 'send_booking_sms' | 'lookup_availability' | 'transfer_call' | 'send_dispatch_request' | 'end_call'>
  /** Free-form check list passed into the scoring rubric. */
  checks?: string[]
}

export type ScenarioFixture = {
  id: string
  label: string
  /** Industry IDs this scenario applies to. Defaults to all if omitted. */
  applies_to?: string[]
  /** Instructions to the persona LLM. */
  persona: string
  /** What the caller says first (the agent has already greeted them via Retell). */
  opening_line: string
  /** Canned tool responses if the agent calls the tools. */
  tool_mocks?: ToolMock[]
  expectations: ScenarioExpectation
}

export type ToolCallRecord = {
  tool: string
  args: Record<string, unknown>
  response: unknown
}

export type ConversationTurn = {
  role: 'caller' | 'agent'
  text: string
}

export type SimulationResult = {
  business_id: string
  scenario_id: string
  /** The full agent prompt (generated + universal layer). */
  agent_prompt: string
  transcript: ConversationTurn[]
  tool_calls: ToolCallRecord[]
  /** True if the harness terminated because of turn limit, not natural end. */
  hit_turn_limit: boolean
  /** Stop reason: end_call tool, turn limit, persona done, or error. */
  stop_reason: string
}

export type RubricCategory =
  | 'booking_correctness'
  | 'information_completeness'
  | 'sms_consent_disclosure'
  | 'emergency_handling'
  | 'tone_naturalness'
  | 'hallucination_safety'
  | 'edge_case_handling'

export type RubricScore = {
  category: RubricCategory
  /** 0-3. 0 = catastrophic failure, 3 = ideal. */
  score: number
  justification: string
}

export type ScoredResult = SimulationResult & {
  scores: RubricScore[]
  /** 0-1 normalized average across categories. */
  overall: number
  /** True if every must_call fired and no must_not_call fired. */
  expectation_pass: boolean
  expectation_notes: string[]
  /** Anthropic API cost for this pair, in micro-dollars (1e6 = $1). */
  cost_micro: number
}

export type RunSummary = {
  started_at: string
  finished_at: string
  generator_sha: string
  results: ScoredResult[]
}
