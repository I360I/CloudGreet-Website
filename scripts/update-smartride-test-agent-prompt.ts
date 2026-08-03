/**
 * Point the Smart Ride API TEST agent at Steve's EXACT live prompt, so the
 * test behaves like the real agent - just with the airport quote/booking
 * routed through his API (smartride_airport_quote / smartride_airport_book)
 * instead of the internal quote engine. A top override block redirects the
 * airport path; everything else in his prompt (tone, flow, read-backs, rules)
 * is preserved verbatim. The internal quote/book tools are intentionally left
 * OFF this agent so the only way to quote/book is through Steve's API.
 *
 * Run: npx tsx --env-file=.env.local scripts/update-smartride-test-agent-prompt.ts
 */
const RETELL = 'https://api.retellai.com'
const rh = { Authorization: `Bearer ${process.env.RETELL_API_KEY}`, 'Content-Type': 'application/json' }
const WEBHOOK = 'https://cloudgreet.com/api/retell/voice-webhook'
const STEVE_AGENT = 'agent_97e040eff72c6f2567605c8cc2'
const TEST_AGENT = 'agent_840fb7e8fe45b7450cbf684c5b'

const AIRPORT_ENUM = ['CMH', 'LCK', 'LANE_CMH', 'SIGNATURE_CMH', 'NETJETS_CMH', 'OSU_FBO', 'RICKENBACKER_FBO']
const tripProps = {
  tripType: { type: 'string', enum: ['One Way', 'Round Trip'], description: 'One Way or Round Trip.' },
  direction: { type: 'string', enum: ['To the airport', 'From the airport'], description: 'To the airport or From the airport.' },
  airport: { type: 'string', enum: AIRPORT_ENUM, description: 'Airport/FBO code. CMH = John Glenn Columbus, LCK = Rickenbacker. Default CMH unless they name an FBO.' },
  localAddress: { type: 'string', description: "The non-airport pickup or drop-off address - the FULL street address INCLUDING the city (and state if known), e.g. '1111 Main Street, Columbus, OH'. A bare street name with no city cannot be routed and will fail; always confirm the city before sending." },
  pickupDate: { type: 'string', description: 'Pickup date as YYYY-MM-DD. Use the CURRENT year from the current time given in the prompt. Must be at least 24 hours out.' },
  pickupTime: { type: 'string', description: 'Pickup time as 24-hour HH:MM Eastern, e.g. 17:00 for 5 PM.' },
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
  description: "Get Steve's authoritative airport quote + availability. Call once you have trip type, direction, airport, the local address, and pickup date/time. Returns price, currency, and availability. Never calculate a price yourself.",
  parameters: { type: 'object', properties: tripProps, required: ['tripType', 'direction', 'airport', 'localAddress', 'pickupDate', 'pickupTime'] },
}
const BOOK_TOOL = {
  type: 'custom', name: 'smartride_airport_book', url: WEBHOOK,
  speak_during_execution: true, speak_after_execution: true,
  description: "Submit a caller-approved airport booking to Steve. Call ONLY after the caller heard the quote and agreed, and you have first name, last name, phone, and email. Send the SAME trip details. Returns a reference. The ride is PENDING Steve's confirmation - never say confirmed/booked.",
  parameters: { type: 'object', properties: { ...tripProps, firstName: { type: 'string' }, lastName: { type: 'string' }, phone: { type: 'string', description: '10-digit US phone.' }, email: { type: 'string' }, flightNumber: { type: 'string' }, returnFlightNumber: { type: 'string' }, specialItems: { type: 'string' }, notes: { type: 'string' } }, required: ['tripType', 'direction', 'airport', 'localAddress', 'pickupDate', 'pickupTime', 'firstName', 'lastName', 'phone', 'email'] },
}

const OVERRIDE = `<!-- cg:smartride_api_test:start -->
=== TEST MODE OVERRIDE (HIGHEST PRIORITY - overrides anything below that conflicts) ===
This agent books AIRPORT rides through Steve's own booking system, not the internal quote engine.

- For AIRPORT trips (to or from CMH, Rickenbacker/LCK, or an FBO): do NOT use compute_quote, lookup_drive_time, lookup_availability, or book_appointment. Those are OFF for airport rides here. Instead:
  1. Gather the trip details (direction to/from airport, which airport, the local address, date, time, one-way vs round trip, passengers, bags). The local address MUST be a full street address WITH the city (e.g. "1111 Main Street, Columbus"). A street with no city can't be routed - if the caller only gives a street, ask which city before you quote.
  2. Call smartride_airport_quote. Steve's system returns the price and whether that time is available. Read the total back exactly as returned. If it says not available, don't say it's booked - offer to send it to Steve to check or try another time.
  3. Once the caller agrees and you've collected first name, last name, phone, and email (plus airline + flight number if they have it), call smartride_airport_book with the SAME trip details. Read the returned reference number back and say it's PENDING Steve's confirmation - never "confirmed" or "booked".
- Pass dates to the tools as YYYY-MM-DD using the CURRENT year from the current time above, and times as 24-hour HH:MM Eastern. Steve needs at least 24 hours notice.
- NEVER calculate a price, distance, or availability yourself - only read back what Steve's tools return.
- For NON-AIRPORT rides: handle them exactly as the prompt below says (Steve takes those personally - text him at 614-546-7661 or transfer).

Everything below (tone, personality, read-back style, turn-taking, non-airport handling, scope, and all rules) still applies. Only the airport quote/booking MECHANISM changes to the two tools above.
<!-- cg:smartride_api_test:end -->

`

async function main() {
  // Steve's exact live prompt + tools
  const sAgent: any = await (await fetch(`${RETELL}/get-agent/${STEVE_AGENT}`, { headers: rh })).json()
  const sLlm: any = await (await fetch(`${RETELL}/get-retell-llm/${sAgent.response_engine.llm_id}`, { headers: rh })).json()
  const steveTools = sLlm.general_tools || []
  const transfer = steveTools.find((t: any) => t.type === 'transfer_call')
  const endCall = steveTools.find((t: any) => t.type === 'end_call') || { type: 'end_call', name: 'end_call', description: 'End the call once the caller is clearly done.' }

  const newPrompt = OVERRIDE + sLlm.general_prompt
  // Only the API tools + transfer + end_call - internal quote/book tools OFF.
  const newTools = [QUOTE_TOOL, BOOK_TOOL, ...(transfer ? [transfer] : []), endCall]

  // The test agent's own llm
  const tAgent: any = await (await fetch(`${RETELL}/get-agent/${TEST_AGENT}`, { headers: rh })).json()
  const tLlmId = tAgent.response_engine.llm_id

  const up = await fetch(`${RETELL}/update-retell-llm/${tLlmId}`, {
    method: 'PATCH', headers: rh,
    body: JSON.stringify({ general_prompt: newPrompt, general_tools: newTools, begin_message: sLlm.begin_message || 'Thanks for calling Smart Ride Central Ohio, how can I help?' }),
  })
  if (!up.ok) throw new Error('update failed: ' + (await up.text()).slice(0, 300))
  const after: any = await (await fetch(`${RETELL}/get-retell-llm/${tLlmId}`, { headers: rh })).json()
  console.log('test agent now uses Steve\'s exact prompt +', (after.general_tools || []).length, 'tools:', (after.general_tools || []).map((t: any) => t.name).join(', '))
  console.log('prompt length:', after.general_prompt.length, '| smartride override present:', after.general_prompt.includes('cg:smartride_api_test:start'))
  console.log('\nDONE. Test line is unchanged: +16148927691')
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
