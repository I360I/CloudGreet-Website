/**
 * GO-LIVE: swap the rebuilt Smart Ride flow onto Steve's LIVE Retell agent.
 *
 * This is the ONE remaining production step, deliberately separated from the
 * test-agent rebuild so it can never run by accident. It:
 *   1) refuses to run unless CONFIRM=GOLIVE is set,
 *   2) snapshots the live agent's current prompt/tools/KB to a backup JSON
 *      (instant rollback),
 *   3) uploads the file-based KB,
 *   4) applies the tested prompt + smartride tools + KB to the LIVE agent LLM.
 *
 * It applies EXACTLY what was validated on the test line (+16148927691):
 * same prompt.md, same knowledge-base.md, same tool set (airport quote/book via
 * Steve's API + his send_dispatch_request / transfer_call / end_call).
 *
 * BEFORE running this, production must be armed in Vercel:
 *   - SMARTRIDE_API_KEY_PROD = the src_live_... key   (already staged)
 *   - SMARTRIDE_MODE = production                     (flip from sandbox)
 *   then redeploy so the webhook picks up production mode. Otherwise the live
 *   agent would book against the sandbox (simulated, saved:false).
 *
 * Run (only when Steve approves):
 *   CONFIRM=GOLIVE npx tsx --env-file=.env.local scripts/golive-smartride-live-agent.ts
 *
 * Rollback:
 *   npx tsx --env-file=.env.local scripts/golive-smartride-live-agent.ts --rollback <backup.json>
 */
import { readFileSync, writeFileSync } from 'fs'
const RETELL = 'https://api.retellai.com'
const rh = { Authorization: `Bearer ${process.env.RETELL_API_KEY}`, 'Content-Type': 'application/json' }
const WEBHOOK = 'https://cloudgreet.com/api/retell/voice-webhook'
const STEVE_AGENT = 'agent_97e040eff72c6f2567605c8cc2'   // Steve's LIVE agent
const S = __dirname + '/smartride'

const AIRPORT_ENUM = ['CMH', 'LCK', 'LANE_CMH', 'SIGNATURE_CMH', 'NETJETS_CMH', 'OSU_FBO', 'RICKENBACKER_FBO']
const tripProps = {
  tripType: { type: 'string', enum: ['One Way', 'Round Trip'], description: 'One Way or Round Trip.' },
  direction: { type: 'string', enum: ['To the airport', 'From the airport'], description: 'To the airport or From the airport.' },
  airport: { type: 'string', enum: AIRPORT_ENUM, description: 'Airport/FBO code. CMH = John Glenn Columbus, LCK = Rickenbacker. Default CMH unless they name an FBO.' },
  localAddress: { type: 'string', description: "The non-airport pickup or drop-off address - FULL street address INCLUDING the city, e.g. '1111 Main Street, Columbus, OH'. A bare street with no city can't be routed; confirm the city first." },
  pickupDate: { type: 'string', description: 'Pickup date YYYY-MM-DD, using the CURRENT year from the current time in the prompt. At least 24 hours out.' },
  pickupTime: { type: 'string', description: 'Pickup time 24-hour HH:MM Eastern, e.g. 17:00 for 5 PM.' },
  stopCount: { type: 'integer', enum: [0, 1, 2], description: 'Extra stops. Default 0.' },
  stop1Address: { type: 'string', description: 'First extra stop (if stopCount >= 1).' },
  stop2Address: { type: 'string', description: 'Second extra stop (if stopCount = 2).' },
  returnDate: { type: 'string', description: 'Return date YYYY-MM-DD (Round Trip).' },
  returnTime: { type: 'string', description: 'Return time HH:MM Eastern (Round Trip).' },
  passengers: { type: 'integer', description: 'Passengers, 1 to 6.' },
  checkedBags: { type: 'integer', description: 'Checked bags, 0 to 5.' },
  carryOns: { type: 'integer', description: 'Carry-ons.' },
  carSeats: { type: 'integer', description: 'Car seats, 0 to 3.' },
}
const QUOTE_TOOL = {
  type: 'custom', name: 'smartride_airport_quote', url: WEBHOOK,
  speak_during_execution: false, speak_after_execution: true,
  description: "Get Steve's authoritative airport quote + availability. Call once you have trip type, direction, airport, the full local address with city, and pickup date/time. Returns price, currency, availability. Never calculate a price yourself.",
  parameters: { type: 'object', properties: tripProps, required: ['tripType', 'direction', 'airport', 'localAddress', 'pickupDate', 'pickupTime'] },
}
const BOOK_TOOL = {
  type: 'custom', name: 'smartride_airport_book', url: WEBHOOK,
  speak_during_execution: false, speak_after_execution: true,
  description: "Submit a caller-approved airport booking to Steve. Call ONLY after the caller heard the quote and agreed, and you have first name, last name, phone, and email. Send the SAME trip details. Returns a reference; the ride is PENDING Steve's confirmation - never say confirmed/booked.",
  parameters: { type: 'object', properties: { ...tripProps, firstName: { type: 'string' }, lastName: { type: 'string' }, phone: { type: 'string', description: '10-digit US phone.' }, email: { type: 'string' }, flightNumber: { type: 'string' }, returnFlightNumber: { type: 'string' }, specialItems: { type: 'string', description: 'Oversized items, gate codes, child seats, wheelchair, etc.' }, notes: { type: 'string' } }, required: ['tripType', 'direction', 'airport', 'localAddress', 'pickupDate', 'pickupTime', 'firstName', 'lastName', 'phone', 'email'] },
}
// Steve's original long greeting (restored per owner request 2026-08-04). The
// airport-vs-else branch is handled by the prompt's first turn, not the greeting.
const BEGIN = "Thank you for calling Smart Ride Central Ohio, where every ride is personally driven by owner Steve French.\n\nYou're speaking with our smart booking system, which can help with pricing, availability, airport transportation, and bookings.\n\nThis call may be recorded and transcribed for quality and training purposes.\n\nIf you'd like to speak directly with Steve, just say 'transfer' and I'll try to connect you.\n\nHow can I help you today?"

async function getLlmId(agentId: string): Promise<string> {
  const a: any = await (await fetch(`${RETELL}/get-agent/${agentId}`, { headers: rh })).json()
  if (!a?.response_engine?.llm_id) throw new Error('could not resolve llm_id for ' + agentId)
  return a.response_engine.llm_id
}

async function rollback(backupPath: string) {
  const b = JSON.parse(readFileSync(backupPath, 'utf8'))
  const llmId = await getLlmId(STEVE_AGENT)
  const res = await fetch(`${RETELL}/update-retell-llm/${llmId}`, {
    method: 'PATCH', headers: rh,
    body: JSON.stringify({
      general_prompt: b.general_prompt,
      general_tools: b.general_tools,
      knowledge_base_ids: b.knowledge_base_ids || [],
      begin_message: b.begin_message,
    }),
  })
  if (!res.ok) throw new Error('rollback failed: ' + (await res.text()).slice(0, 300))
  console.log('ROLLED BACK live agent to snapshot:', backupPath)
}

async function goLive() {
  if (process.env.CONFIRM !== 'GOLIVE') {
    console.log('Refusing to run: set CONFIRM=GOLIVE to swap the LIVE agent.\n')
    console.log('Go-live runbook:')
    console.log('  1) vercel env: SMARTRIDE_MODE=production  (SMARTRIDE_API_KEY_PROD already staged)')
    console.log('  2) redeploy (git push / vercel deploy) so the webhook reads production mode')
    console.log('  3) CONFIRM=GOLIVE npx tsx --env-file=.env.local scripts/golive-smartride-live-agent.ts')
    console.log('  4) place one real test call; confirm a real reference (not SR-SANDBOX-*) comes back')
    return
  }

  const llmId = await getLlmId(STEVE_AGENT)
  const live: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: rh })).json()

  // 1) snapshot current live config for instant rollback
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = `${S}/backup-live-agent.${stamp}.json`
  writeFileSync(backupPath, JSON.stringify({
    savedAt: stamp, agentId: STEVE_AGENT, llmId,
    general_prompt: live.general_prompt,
    general_tools: live.general_tools,
    knowledge_base_ids: live.knowledge_base_ids || [],
    begin_message: live.begin_message,
  }, null, 2))
  console.log('Backup written:', backupPath, `(prompt ${((live.general_prompt || '').length)} chars, ${(live.general_tools || []).length} tools)`) // rollback source

  // 2) file-based KB
  const kbText = readFileSync(`${S}/knowledge-base.md`, 'utf8')
  const fd = new FormData()
  fd.append('knowledge_base_name', 'Smart Ride (live)')
  fd.append('knowledge_base_files', new Blob([kbText], { type: 'text/markdown' }), 'smart-ride-knowledge-base.md')
  const kb: any = await (await fetch(`${RETELL}/create-knowledge-base`, { method: 'POST', headers: { Authorization: rh.Authorization }, body: fd })).json()
  if (!kb?.knowledge_base_id) throw new Error('kb failed: ' + JSON.stringify(kb).slice(0, 300))
  console.log('KB (file):', kb.knowledge_base_id)

  // 3) tools: airport API + reuse Steve's own dispatch/transfer/end_call schemas
  const pick = (n: string) => (live.general_tools || []).find((t: any) => t.name === n || t.type === n)
  const dispatch = pick('send_dispatch_request')
  const transfer = pick('transfer_call')
  const endCall = pick('end_call') || { type: 'end_call', name: 'end_call', description: 'End the call once the caller is clearly done.' }
  const tools = [QUOTE_TOOL, BOOK_TOOL, ...(dispatch ? [dispatch] : []), ...(transfer ? [transfer] : []), endCall]

  // 4) apply the tested prompt + tools + KB to the LIVE agent
  const prompt = readFileSync(`${S}/prompt.md`, 'utf8')
  const up = await fetch(`${RETELL}/update-retell-llm/${llmId}`, {
    method: 'PATCH', headers: rh,
    body: JSON.stringify({ general_prompt: prompt, general_tools: tools, knowledge_base_ids: [kb.knowledge_base_id], begin_message: BEGIN }),
  })
  if (!up.ok) throw new Error('llm update failed: ' + (await up.text()).slice(0, 300))

  const after: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: rh })).json()
  console.log('LIVE agent updated. prompt:', after.general_prompt.length, 'chars | tools:', (after.general_tools || []).map((t: any) => t.name).join(', '))
  console.log('kb attached:', JSON.stringify(after.knowledge_base_ids || []))
  console.log('\nDONE. Steve\'s live line now runs the airport-API flow.')
  console.log('If anything looks wrong, roll back instantly:')
  console.log(`  npx tsx --env-file=.env.local scripts/golive-smartride-live-agent.ts --rollback ${backupPath}`)
}

const rbIdx = process.argv.indexOf('--rollback')
if (rbIdx !== -1 && process.argv[rbIdx + 1]) {
  rollback(process.argv[rbIdx + 1]).catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
} else {
  goLive().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
}
