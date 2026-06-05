/**
 * Wrapper that invokes the REAL prompt generator from lib/agent-builder.
 *
 * We don't reimplement anything - we import generateAgentPrompt() directly
 * so the eval is testing the same code path that builds production
 * agents. The synthetic BusinessContext from the fixtures flows in
 * unmodified.
 *
 * The universal layer is appended via composeFinalPrompt() so the
 * agent under test sees the exact prompt a real CloudGreet agent would.
 *
 * Returns the generation cost alongside the prompt so the caller can
 * fold it into the per-run cost meter (generation uses its own client,
 * so our CostMeter wrapper can't see those tokens directly).
 */

import { generateAgentPrompt } from '../../../lib/agent-builder/generate'
import { composeFinalPrompt } from '../../../lib/agent-builder/universal-layer'
import type { BusinessFixture } from './types'

export async function generateFullPromptForBusiness(
  b: BusinessFixture,
): Promise<{ prompt: string; cost_micro: number }> {
  // When the fixture carries a live_prompt (mode='client', pulled from
  // the deployed Retell LLM), use it verbatim. This tests what callers
  // actually hit today, not what the generator would produce fresh.
  // The universal layer is NOT re-appended - the live prompt already
  // has it baked in from when the agent was created/last wired.
  if (b.live_prompt && b.live_prompt.trim()) {
    // Append the live Retell knowledge base so the eval agent can draw on
    // the same facts a real caller's agent retrieves (Retell does RAG; we
    // inline the full text - the closest a prompt-only sim can get).
    let prompt = b.live_prompt
    if (b.live_knowledge && b.live_knowledge.trim()) {
      prompt += `\n\n# KNOWLEDGE BASE\n\nThe following is the business's knowledge base. Use it for facts (services, pricing, hours, policies, service area). Do not state anything beyond the prompt and this knowledge.\n\n${b.live_knowledge}`
    }
    return { prompt, cost_micro: 0 }
  }
  const res = await generateAgentPrompt(b.context)
  if (res.ok !== true) {
    const errMsg = (res as { ok: false; error: string }).error
    throw new Error(`generateAgentPrompt failed for ${b.id}: ${errMsg}`)
  }
  return {
    prompt: composeFinalPrompt(res.prompt),
    cost_micro: res.cost_micro || 0,
  }
}
