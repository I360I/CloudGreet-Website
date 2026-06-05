/**
 * Force re-provision the managed prompt-generator agent so it adopts the
 * current V21_SYSTEM_PROMPT (lib/agent-builder/v21-system-prompt.ts).
 *
 * The interactive "prompt gen" chat runs a managed Anthropic agent whose
 * system prompt is cached in cloudgreet_system_config by prompt_hash. Editing
 * v21-system-prompt.ts does nothing until this re-provisions, which is why
 * agents generated before a refresh keep the old (caller-ID-trusting) prompt.
 *
 * Run: npx tsx --env-file=.env.local scripts/reprovision-prompt-gen.ts
 */

import { provisionPromptGeneratorAgent } from '@/lib/agent-builder/managed-agent-client'

async function main() {
  const before = await provisionPromptGeneratorAgent({}) // current cached IDs
  console.log('current generator agent:', before.agent_id)
  const after = await provisionPromptGeneratorAgent({ force: true })
  console.log('re-provisioned generator agent:', after.agent_id)
  console.log(after.agent_id === before.agent_id
    ? 'unchanged (prompt hash already current)'
    : 'NEW agent now serves the updated V21_SYSTEM_PROMPT - new prompt-gen sessions will ask for the callback number + book emergencies.')
}

main().catch((e) => { console.error(e); process.exit(1) })
