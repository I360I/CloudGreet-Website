/**
 * Apply the unified airport + non-airport flow to Steve's LIVE agent:
 *   - new prompt (scripts/smartride/prompt.md)
 *   - new KB (scripts/smartride/knowledge-base.md)
 *   - tools: airport quote/book + NON-AIRPORT quote/book + his own
 *     send_dispatch_request / transfer_call / end_call
 *   - then PUBLISH so the live line actually serves it (versions are snapshots;
 *     update-retell-llm alone only edits the draft).
 *
 * Run: npx tsx --env-file=.env.local scripts/update-smartride-unified.ts
 */
import { readFileSync } from 'fs'
const RETELL = 'https://api.retellai.com'
const rh: any = { Authorization: `Bearer ${process.env.RETELL_API_KEY}`, 'Content-Type': 'application/json' }
const A: any = { Authorization: `Bearer ${process.env.RETELL_API_KEY}` }
const WEBHOOK = 'https://cloudgreet.com/api/retell/voice-webhook'
const AGENT = 'agent_97e040eff72c6f2567605c8cc2'
const S = '/Users/anthony/Projects/cloudgreet/scripts/smartride'

const AIRPORT_ENUM = ['CMH', 'LCK', 'LANE_CMH', 'SIGNATURE_CMH', 'NETJETS_CMH', 'OSU_FBO', 'RICKENBACKER_FBO']
const common = {
  tripType: { type: 'string', enum: ['One Way', 'Round Trip'], description: 'One Way or Round Trip.' },
  pickupDate: { type: 'string', description: 'Pickup date YYYY-MM-DD, using the CURRENT year. At least 12 hours out.' },
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
const customer = {
  firstName: { type: 'string' }, lastName: { type: 'string' },
  phone: { type: 'string', description: '10-digit US phone.' }, email: { type: 'string' },
  notes: { type: 'string', description: 'Bags, passenger count, gate codes, wheelchair, special requests, etc.' },
}

const airportProps = {
  ...common,
  direction: { type: 'string', enum: ['To the airport', 'From the airport'], description: 'To the airport or From the airport.' },
  airport: { type: 'string', enum: AIRPORT_ENUM, description: 'Airport/FBO code. CMH = John Glenn Columbus, LCK = Rickenbacker. Default CMH unless they name an FBO.' },
  localAddress: { type: 'string', description: "The non-airport pickup or drop-off address, FULL street address INCLUDING the city, e.g. '1111 Main Street, Columbus, OH'." },
}
const AIRPORT_QUOTE = {
  type: 'custom', name: 'smartride_airport_quote', url: WEBHOOK, speak_during_execution: false, speak_after_execution: true,
  description: "Get Steve's authoritative AIRPORT quote + availability. Call once you have trip type, direction, airport, the full local address with city, and pickup date/time. Never calculate a price yourself.",
  parameters: { type: 'object', properties: airportProps, required: ['tripType', 'direction', 'airport', 'localAddress', 'pickupDate', 'pickupTime'] },
}
const AIRPORT_BOOK = {
  type: 'custom', name: 'smartride_airport_book', url: WEBHOOK, speak_during_execution: false, speak_after_execution: true,
  description: "Submit a caller-approved AIRPORT booking to Steve. Call ONLY after the caller heard the quote and agreed, and you have first name, last name, phone, and email. Send the SAME trip details. Returns a reference; the ride is PENDING Steve's review, never say confirmed/booked.",
  parameters: { type: 'object', properties: { ...airportProps, ...customer, flightNumber: { type: 'string' }, returnFlightNumber: { type: 'string' }, specialItems: { type: 'string', description: 'Oversized items, child seats, wheelchair, etc.' } }, required: ['tripType', 'direction', 'airport', 'localAddress', 'pickupDate', 'pickupTime', 'firstName', 'lastName', 'phone', 'email'] },
}

const naProps = {
  ...common,
  serviceOption: { type: 'string', enum: ['Point-to-Point Transfer', 'Independent Living', 'Hourly / Event Service', 'Concert / Sporting Event'], description: 'The kind of non-airport ride, EXACTLY one of these strings.' },
  pickup: { type: 'string', description: "Pickup address, FULL street address INCLUDING the city, e.g. '1111 Main Street, Columbus, OH'." },
  destination: { type: 'string', description: "Destination address, FULL street address INCLUDING the city." },
  serviceHours: { type: 'integer', description: 'Whole number of hours (<=12) for Hourly / Event Service (min 2) or Independent Living (min 1).' },
  promoCode: { type: 'string', description: 'Optional promo code if the caller gives one.' },
}
const NA_QUOTE = {
  type: 'custom', name: 'smartride_nonairport_quote', url: WEBHOOK, speak_during_execution: false, speak_after_execution: true,
  description: "Get Steve's authoritative NON-AIRPORT quote + availability (point-to-point, hourly/event, concert/sporting, independent living). Call once you have the serviceOption, full pickup AND destination with city, and pickup date/time. Never calculate a price yourself.",
  parameters: { type: 'object', properties: naProps, required: ['serviceOption', 'tripType', 'pickup', 'destination', 'pickupDate', 'pickupTime'] },
}
const NA_BOOK = {
  type: 'custom', name: 'smartride_nonairport_book', url: WEBHOOK, speak_during_execution: false, speak_after_execution: true,
  description: "Submit a caller-approved NON-AIRPORT booking to Steve. Call ONLY after the caller heard the quote and agreed, and you have first name, last name, phone, and email. Send the SAME trip details. Returns a reference; the ride is PENDING Steve's review, never say confirmed/booked.",
  parameters: { type: 'object', properties: { ...naProps, ...customer }, required: ['serviceOption', 'tripType', 'pickup', 'destination', 'pickupDate', 'pickupTime', 'firstName', 'lastName', 'phone', 'email'] },
}

async function main() {
  const prompt = readFileSync(`${S}/prompt.md`, 'utf8')
  const kbText = readFileSync(`${S}/knowledge-base.md`, 'utf8')

  const agent: any = await (await fetch(`${RETELL}/get-agent/${AGENT}`, { headers: A })).json()
  const llmId = agent.response_engine.llm_id
  const llm: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: A })).json()
  const pick = (n: string) => (llm.general_tools || []).find((t: any) => t.name === n || t.type === n)
  const dispatch = pick('send_dispatch_request')
  const transfer = pick('transfer_call')
  const endCall = pick('end_call') || { type: 'end_call', name: 'end_call' }
  const tools = [AIRPORT_QUOTE, AIRPORT_BOOK, NA_QUOTE, NA_BOOK, ...(dispatch ? [dispatch] : []), ...(transfer ? [transfer] : []), endCall]

  // new KB
  const fd = new FormData()
  fd.append('knowledge_base_name', 'Smart Ride (unified)')
  fd.append('knowledge_base_files', new Blob([kbText], { type: 'text/markdown' }), 'smart-ride-knowledge-base.md')
  const kb: any = await (await fetch(`${RETELL}/create-knowledge-base`, { method: 'POST', headers: A, body: fd })).json()
  if (!kb?.knowledge_base_id) throw new Error('kb failed: ' + JSON.stringify(kb).slice(0, 200))
  console.log('new KB:', kb.knowledge_base_id)

  const up = await fetch(`${RETELL}/update-retell-llm/${llmId}`, {
    method: 'PATCH', headers: rh,
    body: JSON.stringify({ general_prompt: prompt, general_tools: tools, knowledge_base_ids: [kb.knowledge_base_id] }),
  })
  if (!up.ok) throw new Error('llm update failed: ' + (await up.text()).slice(0, 300))

  const pub = await fetch(`${RETELL}/publish-agent/${AGENT}`, { method: 'POST', headers: rh })
  console.log('publish-agent:', pub.status)
  await new Promise((r) => setTimeout(r, 3000))

  // verify the highest PUBLISHED version has all 4 tools + new prompt
  for (const v of [50, 49, 48, 47, 46]) {
    const r: any = await (await fetch(`${RETELL}/get-agent/${AGENT}?version=${v}`, { headers: A, cache: 'no-store' as any })).json()
    if (r?.error || !r?.response_engine) continue
    const l: any = await (await fetch(`${RETELL}/get-retell-llm/${r.response_engine.llm_id}?version=${v}`, { headers: A, cache: 'no-store' as any })).json()
    console.log(`v${v}: published=${r.is_published} | prompt_len=${(l.general_prompt || '').length} | tools=${(l.general_tools || []).map((t: any) => t.name || t.type).join(',')}`)
  }
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const s: any = await (await fetch(`${RETELL}/get-knowledge-base/${kb.knowledge_base_id}`, { headers: A })).json()
    if (s.status === 'complete') { console.log('KB indexed: complete'); break }
  }
  console.log('\nDONE. Live agent now runs airport + non-airport via Steve unified API.')
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
