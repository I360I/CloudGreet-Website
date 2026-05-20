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
 */

import { generateAgentPrompt } from '../../../lib/agent-builder/generate'
import { composeFinalPrompt } from '../../../lib/agent-builder/universal-layer'
import type { BusinessFixture } from './types'

export async function generateFullPromptForBusiness(b: BusinessFixture): Promise<string> {
  const res = await generateAgentPrompt(b.context)
  if (res.ok !== true) {
    const errMsg = (res as { ok: false; error: string }).error
    throw new Error(`generateAgentPrompt failed for ${b.id}: ${errMsg}`)
  }
  return composeFinalPrompt(res.prompt)
}
