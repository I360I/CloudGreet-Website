/**
 * Process a single (business, scenario) pair end-to-end: simulate the
 * conversation, score it with the judge, return the ScoredResult with
 * cost attached.
 *
 * The Anthropic client passed in MUST already be wrapped by a
 * CostMeter so simulate + score calls flow through it. If the caller
 * also produced the agent prompt via generateAgentPrompt() (which uses
 * its own internal client), they can pass `extraCostMicro` to fold
 * that generation cost in for this pair.
 *
 * Shared by the CLI runner (eval.ts) and the admin one-click API route
 * (app/api/admin/quality/process) so they can't drift.
 */

import Anthropic from '@anthropic-ai/sdk'
import { runSimulation } from './simulate'
import { scoreSimulation } from './score'
import { CostMeter } from './cost'
import type { BusinessFixture, ScenarioFixture, ScoredResult } from './types'

export async function processPair(
  client: Anthropic,
  agentPrompt: string,
  rubric: string,
  business: BusinessFixture,
  scenario: ScenarioFixture,
  opts: { extraCostMicro?: number } = {},
): Promise<ScoredResult> {
  const meter = new CostMeter()
  meter.attach(client)
  if (opts.extraCostMicro) meter.recordCostMicro(opts.extraCostMicro)

  const sim = await runSimulation(client, agentPrompt, business, scenario)
  const scored = await scoreSimulation(client, rubric, business, scenario, sim)
  return { ...scored, cost_micro: meter.microDollars() }
}
