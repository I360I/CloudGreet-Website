/**
 * One-off: inject the quick_availability block into Steve's live Retell agent prompt.
 * Fixes: caller asking "are you available Thursday at 4:30?" was forced through the
 * full pickup/name/phone/passengers/email intake before the agent ever checked the
 * calendar, and pickup/date details got confirmed twice in a row. See Steve's 7/19
 * 3:19pm test call.
 * Run with: npx tsx scripts/patch-quick-availability-voice.ts
 */

import 'dotenv/config'
import { syncQuickAvailabilityToPrompt } from '../lib/agent-prompt-patches'

const STEVE_BIZ_ID = '650406c3-5585-446e-958d-0fbcccf54795'

async function main() {
  console.log('Patching quick-availability rule into Steve\'s Retell voice agent prompt...')
  const result = await syncQuickAvailabilityToPrompt({ businessId: STEVE_BIZ_ID })
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
