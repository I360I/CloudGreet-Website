/**
 * Rebuild the Smart Ride agent (applied to the TEST agent for now, NOT the
 * live line) with:
 *   - the new trimmed prompt (behavior + airport-API flow; non-airport,
 *     cancel, reschedule all route to Steve)
 *   - a FILE-based knowledge base (uploaded document, not inline text)
 *   - the airport quote/book tools + send_dispatch_request + transfer + end_call
 *
 * Stays on the test line +16148927691. Swap onto Steve's live agent only
 * after he issues PRODUCTION credentials and this is reviewed.
 *
 * Run: npx tsx --env-file=.env.local scripts/rebuild-smartride-agent.ts
 */
import { readFileSync } from 'fs'
const RETELL = 'https://api.retellai.com'
const rh = { Authorization: `Bearer ${process.env.RETELL_API_KEY}`, 'Content-Type': 'application/json' }
const WEBHOOK = 'https://cloudgreet.com/api/retell/voice-webhook'
const STEVE_AGENT = 'agent_97e040eff72c6f2567605c8cc2'
const TEST_AGENT = 'agent_840fb7e8fe45b7450cbf684c5b'
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
  speak_during_execution: true, speak_after_execution: true,
  description: "Get Steve's authoritative airport quote + availability. Call once you have trip type, direction, airport, the full local address with city, and pickup date/time. Returns price, currency, availability. Never calculate a price yourself.",
  parameters: { type: 'object', properties: tripProps, required: ['tripType', 'direction', 'airport', 'localAddress', 'pickupDate', 'pickupTime'] },
}
const BOOK_TOOL = {
  type: 'custom', name: 'smartride_airport_book', url: WEBHOOK,
  speak_during_execution: true, speak_after_execution: true,
  description: "Submit a caller-approved airport booking to Steve. Call ONLY after the caller heard the quote and agreed, and you have first name, last name, phone, and email. Send the SAME trip details. Returns a reference; the ride is PENDING Steve's confirmation - never say confirmed/booked.",
  parameters: { type: 'object', properties: { ...tripProps, firstName: { type: 'string' }, lastName: { type: 'string' }, phone: { type: 'string', description: '10-digit US phone.' }, email: { type: 'string' }, flightNumber: { type: 'string' }, returnFlightNumber: { type: 'string' }, specialItems: { type: 'string', description: 'Oversized items, gate codes, child seats, wheelchair, etc.' }, notes: { type: 'string' } }, required: ['tripType', 'direction', 'airport', 'localAddress', 'pickupDate', 'pickupTime', 'firstName', 'lastName', 'phone', 'email'] },
}

async function main() {
  const prompt = readFileSync(`${S}/prompt.md`, 'utf8')
  const kbText = readFileSync(`${S}/knowledge-base.md`, 'utf8')

  // 1) FILE-based knowledge base (upload the .md as a document, not inline text)
  const fd = new FormData()
  fd.append('knowledge_base_name', 'Smart Ride (rebuilt)')
  fd.append('knowledge_base_files', new Blob([kbText], { type: 'text/markdown' }), 'smart-ride-knowledge-base.md')
  const kb: any = await (await fetch(`${RETELL}/create-knowledge-base`, {
    method: 'POST', headers: { Authorization: rh.Authorization }, body: fd,
  })).json()
  if (!kb?.knowledge_base_id) throw new Error('kb failed: ' + JSON.stringify(kb).slice(0, 300))
  console.log('KB (file):', kb.knowledge_base_id)

  // 2) tools: airport API + reuse Steve's send_dispatch_request / transfer_call / end_call schemas
  const sA: any = await (await fetch(`${RETELL}/get-agent/${STEVE_AGENT}`, { headers: rh })).json()
  const sL: any = await (await fetch(`${RETELL}/get-retell-llm/${sA.response_engine.llm_id}`, { headers: rh })).json()
  const pick = (n: string) => (sL.general_tools || []).find((t: any) => t.name === n || t.type === n)
  const dispatch = pick('send_dispatch_request')
  const transfer = pick('transfer_call')
  const endCall = pick('end_call') || { type: 'end_call', name: 'end_call', description: 'End the call once the caller is clearly done.' }
  const tools = [QUOTE_TOOL, BOOK_TOOL, ...(dispatch ? [dispatch] : []), ...(transfer ? [transfer] : []), endCall]

  // 3) update the TEST agent's LLM
  const tA: any = await (await fetch(`${RETELL}/get-agent/${TEST_AGENT}`, { headers: rh })).json()
  const tLlmId = tA.response_engine.llm_id
  const up = await fetch(`${RETELL}/update-retell-llm/${tLlmId}`, {
    method: 'PATCH', headers: rh,
    body: JSON.stringify({
      general_prompt: prompt,
      general_tools: tools,
      knowledge_base_ids: [kb.knowledge_base_id],
      begin_message: 'Thanks for calling Smart Ride Central Ohio, are you needing a ride to or from the airport, or somewhere else?',
    }),
  })
  if (!up.ok) throw new Error('llm update failed: ' + (await up.text()).slice(0, 300))

  const after: any = await (await fetch(`${RETELL}/get-retell-llm/${tLlmId}`, { headers: rh })).json()
  console.log('new prompt length:', after.general_prompt.length, '(was 53989) | reduction:', Math.round((1 - after.general_prompt.length / 53989) * 100) + '%')
  console.log('tools:', (after.general_tools || []).map((t: any) => t.name).join(', '))
  console.log('kb attached:', JSON.stringify(after.knowledge_base_ids || []))
  // wait for KB to index
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const s: any = await (await fetch(`${RETELL}/get-knowledge-base/${kb.knowledge_base_id}`, { headers: rh })).json()
    console.log('kb status:', s.status)
    if (s.status === 'complete') break
  }
  console.log('\nDONE. Test line +16148927691 now runs the rebuilt agent (airport via API, everything else to Steve).')
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
