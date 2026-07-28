/**
 * Steve's booking-polish batch (from his Jul 28 ChatGPT-review email),
 * applied to BOTH channels after diffing against the live prompts.
 *
 * Already existed (left alone): voice mandatory read-back, voice bags
 * capture + special-notes step, voice return-ride ask in the quote flow,
 * SMS required flight info + pre-dispatch checklist, date echo, Steve
 * mentions, returning-caller names.
 *
 * Added here - voice: fuller read-back (bags/flight/total), oversized-
 * luggage nuance on airport trips, optional flight number on dropoffs,
 * per-trip pricing explanation, return-ride offer AFTER booking (dropoffs
 * only), concrete special-notes examples, reassuring airport closing,
 * "what time should I leave" guidance via lookup_drive_time.
 * Added - SMS: luggage folded into the airport flight question, one
 * customer-facing final review before book/dispatch (Steve's #1), per-trip
 * pricing explanation, post-booking return offer (dropoffs only),
 * reassuring airport closing.
 *
 * Deliberately skipped: flight-validation API (roadmap), repeat-customer
 * SMS greeting (code change), "family vacation" inference (creepy when
 * wrong), transition rewrites (both prompts already tone-engineered).
 *
 * Idempotent via cg:steve_booking_polish markers. Verifies no tools were
 * eaten by the Retell PATCH (known API bug). Run:
 *   npx tsx --env-file=.env.local scripts/patch-smartride-booking-polish.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const RETELL = 'https://api.retellai.com'
const AGENT_ID = 'agent_97e040eff72c6f2567605c8cc2'
const BIZ_ID = '650406c3-5585-446e-958d-0fbcccf54795'
const START = '<!-- cg:steve_booking_polish:start -->'
const END = '<!-- cg:steve_booking_polish:end -->'

const VOICE_BLOCK = `${START}
BOOKING POLISH (refines the flows below; where anything conflicts, THIS section wins):

- FULLER READ-BACK: the mandatory read-back before booking also includes bags, the flight (airport trips), and the quoted total when one was given: "Alright let me read that back. I've got [name], pickup at [pickup] going to [dropoff], [day] [date] at [time], [party size] passengers with [bags]<airport: , on [airline] [flight]>, and the total was [quote]. Sound right?" Still ONE read-back, still no phone number in it. If the caller corrects a detail, fix it, re-confirm only that detail, then book.
- BAGS ON AIRPORT TRIPS: when either end of the trip is an airport, the party-size-and-bags question must cover luggage explicitly: "How many of you, and roughly how many bags - anything oversized, like golf clubs or a stroller?" Put oversized items in the booking notes. (Non-airport trips: keep the bags question casual as before.)
- FLIGHT NUMBER ON DROPOFFS TOO: for airport DROPOFFS, after the time is set, ask once: "If you've got your flight number handy I'll note it - Steve likes to keep an eye on departures." OPTIONAL - never block or delay a dropoff booking on it. For airport pickups the flight number stays REQUIRED as specified below.
- WHY THE PRICE DIDN'T CHANGE: if the passenger count changes and the quote stays the same, explain instead of just repeating: "Same price - Smart Ride charges by the trip, not per passenger, for up to six people."
- OFFER THE RETURN RIDE AFTER BOOKING: right after booking an airport DROPOFF (outbound to CMH or LCK), ask once: "Want me to set up your ride home from the airport while we're at it?" If yes, treat it as a NEW leg: availability check, quote, read-back, book. Never ask this after airport pickups or point-to-point trips, and not if the return is already handled. One ask - if they pass, drop it.
- BAGS AND NOTES TRAVEL WITH THE RIDE: capturing luggage is useless if Steve never sees it. On airport trips, ALWAYS carry the luggage answer through to the tool call: for send_dispatch_request put it in the notes arg (e.g. "Bags: 3 checked, 2 carry-on, golf clubs"); for book_appointment append it to the service description (e.g. "Airport dropoff to CMH - 4 passengers, 3 checked bags + golf clubs"). Special notes (gate code, child seat, wheelchair) ride along the same way. Never leave bags or special notes only in the conversation.
- SPECIAL NOTES, MADE CONCRETE: at the special-notes step ask: "Anything Steve should know - a gate code, child seat, wheelchair, or any extra pickup instructions?"
- AIRPORT BOOKING CLOSING: when an airport trip is booked and a flight number was captured, close with: "You're all set - Steve has the reservation, and he'll keep an eye on your flight on the day, so there's nothing else you need to do."
- "WHAT TIME SHOULD I BE PICKED UP?": when a caller asks what pickup time to pick for a flight, use lookup_drive_time silently for the real drive estimate, and share that Steve recommends being at the airport about two hours before a domestic departure (three for international). Suggest - the pickup time is always their call.
${END}`

const SMS_BLOCK = `${START}
BOOKING POLISH (refines the steps above; where anything conflicts, THIS section wins):

- BAGS ON AIRPORT TRIPS: fold luggage into the airport flight question, one turn: "What airline and flight number are you on? Steve tracks flights to adjust for delays. And roughly how many bags - anything oversized?" Put oversized items in the dispatch/booking notes. Non-airport trips: don't ask about luggage.
- FINAL REVIEW BEFORE BOOKING (replaces the bare "send to Steve or book it?" closing question): once every required piece is in, send ONE review message:
"Please review your reservation:
- [Day, Month Date] at [Time]
- [Name]
- [Pickup address] to [Destination]
- [X] passengers, [bags]
- [Airline + flight number] (airport trips)
- Total: [$amount]
Anything Steve should know - gate code, child seat, extra stop? If it all looks right, want me to book it on Steve's calendar or send it to him to confirm?"
If the customer corrects something, update it and re-confirm only what changed. Their yes/book-it after this review IS the confirmation - the PRE-DISPATCH GATE still applies. One review per leg unless details changed.
- BAGS AND NOTES TRAVEL WITH THE RIDE: on airport trips, always pass the luggage answer through: send_dispatch_request gets it in the notes arg ("Bags: 3 checked, 2 carry-on, oversized: golf clubs"); book_appointment gets it appended to the service description. Gate codes, child seats and extra stops go the same way. Never leave them only in the chat.
- WHY THE PRICE DIDN'T CHANGE: if the passenger count changes and the quote stays the same: "Same price - Smart Ride charges by the trip, not per passenger, for up to six."
- OFFER THE RETURN RIDE: right after booking/dispatching an airport DROPOFF (outbound), ask once: "Want me to set up your ride home from the airport too while it's fresh?" If yes it's a second leg - full flow again (availability, quote, review). Never after airport pickups, and not if the return is already handled. One ask, no pushing.
- AIRPORT CLOSING: when an airport trip is booked and a flight number is on it: "Booked! You're on Steve's calendar - he'll keep an eye on your flight on the day, nothing else you need to do."
${END}`

function upsertBlock(prompt: string, block: string, anchorAfter?: string): string {
  const s = prompt.indexOf(START)
  const e = prompt.indexOf(END)
  if (s !== -1 && e !== -1) {
    return prompt.slice(0, s) + block + prompt.slice(e + END.length)
  }
  if (anchorAfter) {
    const a = prompt.indexOf(anchorAfter)
    if (a !== -1) {
      const insertAt = a + anchorAfter.length
      return prompt.slice(0, insertAt) + '\n\n' + block + prompt.slice(insertAt)
    }
  }
  return prompt + '\n\n' + block
}

async function main() {
  const rh = { Authorization: `Bearer ${process.env.RETELL_API_KEY}`, 'Content-Type': 'application/json' }

  // ---- VOICE ----
  const agent: any = await (await fetch(`${RETELL}/get-agent/${AGENT_ID}`, { headers: rh })).json()
  const llmId = agent?.response_engine?.llm_id
  const llm: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: rh })).json()
  const beforeTools = (llm.general_tools || []).map((t: any) => t.name).sort()
  // Place right after Steve's existing top-priority overrides block.
  const newVoice = upsertBlock(llm.general_prompt, VOICE_BLOCK, '<!-- cg:smartride_overrides:end -->')
  const up = await fetch(`${RETELL}/update-retell-llm/${llmId}`, {
    method: 'PATCH', headers: rh, body: JSON.stringify({ general_prompt: newVoice }),
  })
  if (!up.ok) throw new Error('voice update failed: ' + (await up.text()).slice(0, 200))

  // Post-flight: the Retell PATCH has eaten tools before - verify.
  const after: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: rh })).json()
  const afterTools = (after.general_tools || []).map((t: any) => t.name).sort()
  if (JSON.stringify(beforeTools) !== JSON.stringify(afterTools)) {
    throw new Error(`TOOLS CHANGED! before=${beforeTools} after=${afterTools} - restore needed`)
  }
  console.log('voice patched:', llm.general_prompt.length, '->', after.general_prompt.length, 'chars | tools intact:', afterTools.length)

  // ---- SMS ----
  const { data: biz } = await supabase.from('businesses').select('agent_sms_prompt').eq('id', BIZ_ID).single()
  const newSms = upsertBlock(biz!.agent_sms_prompt, SMS_BLOCK)
  const { error } = await supabase.from('businesses')
    .update({ agent_sms_prompt: newSms, updated_at: new Date().toISOString() })
    .eq('id', BIZ_ID)
  if (error) throw error
  console.log('sms patched:', biz!.agent_sms_prompt.length, '->', newSms.length, 'chars')
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
