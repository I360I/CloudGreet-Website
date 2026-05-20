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
