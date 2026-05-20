/**
 * Process a single (business, scenario) pair end-to-end: simulate the
 * conversation, score it with the judge, return the ScoredResult.
 *
 * Shared by the CLI runner (eval.ts) and the admin one-click API route
 * (app/api/admin/quality/process) so they can't drift.
 */

import Anthropic from '@anthropic-ai/sdk'
import { runSimulation } from './simulate'
import { scoreSimulation } from './score'
import type { BusinessFixture, ScenarioFixture, ScoredResult } from './types'

export async function processPair(
  client: Anthropic,
  agentPrompt: string,
  rubric: string,
  business: BusinessFixture,
  scenario: ScenarioFixture,
): Promise<ScoredResult> {
  const sim = await runSimulation(client, agentPrompt, business, scenario)
  return scoreSimulation(client, rubric, business, scenario, sim)
}
