import { retellAgentManager } from '../lib/retell-agent-manager'

const STEVE_BIZ_ID = '650406c3-5585-446e-958d-0fbcccf54795'

async function main() {
  console.log("Re-wiring Steve's Retell agent tools (adds check_venue_fee)...")
  const trace = await retellAgentManager().ensureLLMToolsForBusiness(STEVE_BIZ_ID)
  console.log('Done:', trace.join(', '))
}

main().catch(err => { console.error(err); process.exit(1) })
