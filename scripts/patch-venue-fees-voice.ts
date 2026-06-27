/**
 * One-off: inject the venue_fees block into Steve's live Retell agent prompt.
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/patch-venue-fees-voice.ts
 */

import 'dotenv/config'
import { syncVenueFeesToPrompt } from '../lib/agent-prompt-patches'

const STEVE_BIZ_ID = '650406c3-5585-446e-958d-0fbcccf54795'

async function main() {
  console.log('Patching venue fees into Steve\'s Retell voice agent prompt...')
  const result = await syncVenueFeesToPrompt({ businessId: STEVE_BIZ_ID })
  console.log('Result:', JSON.stringify(result, null, 2))
  if (result.ok && result.updated) {
    console.log('Prompt updated successfully.')
  } else if (result.ok && !result.updated) {
    console.log('No change needed:', result.reason)
  } else {
    console.error('Failed:', result.reason)
    process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
