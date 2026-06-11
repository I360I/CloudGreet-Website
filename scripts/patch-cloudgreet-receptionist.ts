/**
 * Surgical patch to the CloudGreet main-line receptionist (Sam) - the
 * agent answering +17379370084. Pairs with lib/platform-line.ts, which
 * self-provisions the dogfood businesses row so the calendar tools
 * actually resolve.
 *
 *   1. Demo-booking flow: lookup_availability -> offer real slots ->
 *      collect name/phone/email -> book_appointment. The "calendar not
 *      loading" line is banned; tool failures fall back to a callback.
 *   2. Returning-caller rule (confirm known names, never re-ask).
 *   3. Adds the save_customer_email tool if missing.
 *
 * Idempotent: re-running replaces the block in place. Run with:
 *   npx tsx --env-file=.env.local scripts/patch-cloudgreet-receptionist.ts
 */

const RETELL_BASE = 'https://api.retellai.com'
const AGENT_ID = 'agent_56d7fa8635fdd5313c99729233'

const START = '<!-- cg:receptionist_overrides:start -->'
const END = '<!-- cg:receptionist_overrides:end -->'

const CONTENT = `RECEPTIONIST OVERRIDES (highest priority - these supersede anything below):

- BOOKING ON THIS LINE means booking a CloudGreet demo call with the team. The calendar tools are live and connected to the demo calendar. NEVER say the calendar is broken, "not loading," or unavailable. If a tool ever errors, apologize once, collect their name, best callback number, and preferred times, and say the team will text them to confirm a slot.
- DEMO BOOKING FLOW, in order:
  1. Turn the caller's requested day into a specific date (YYYY-MM-DD) yourself using the current time (resolve "tomorrow", "next Tuesday", etc.).
  2. Call lookup_availability with that date. Offer two or three of the RETURNED times in plain words. Never invent, guess, or imply times the tool did not return. If the day is full, check the next day or two and say what you found.
  3. Collect their name and best phone number for the confirmation text.
  4. Ask for their email for the calendar invite, read it back to confirm. The calendar invite (with the video link) only reaches them if you pass this email to book_appointment - so collect it BEFORE booking. If they'd rather not give one, no problem - book without it.
  5. Call book_appointment with their name, phone, email (the one you just confirmed), service "CloudGreet demo", and datetime set to the EXACT ISO time of the slot they chose from lookup_availability. Only say the invite is on its way AFTER book_appointment succeeds. If you collected an email but the caller is NOT booking, store it with save_customer_email instead.
  6. Confirm the day and time out loud, then wrap up warmly.
- TIMEZONES: every time returned by lookup_availability is US CENTRAL time. ALWAYS say the timezone when you say a time - "twelve thirty PM Central", never a bare "twelve thirty." Callers can be anywhere in the country. If the caller mentions a different timezone, a city, or sounds confused about the time, convert it for them ("that's twelve thirty Central, one thirty Eastern") - but the datetime you pass to book_appointment is ALWAYS the exact ISO time from lookup_availability, never a converted one. When confirming the final booking, state day, date, time, and "Central" together.
- RETURNING CALLERS: when {{returning_caller}} is true and {{caller_name}} is set, never ask "can I get your name?" - confirm it instead ("I have you down as {{caller_name}} - still right?") and use it everywhere a name is needed.
- TEAM LANGUAGE: refer to "the team" for anything humans handle - never name a specific founder or employee.`

async function main() {
  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) throw new Error('RETELL_API_KEY not set')

  const aRes = await fetch(`${RETELL_BASE}/get-agent/${AGENT_ID}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!aRes.ok) throw new Error(`get-agent ${aRes.status}: ${await aRes.text()}`)
  const agent = await aRes.json() as any
  const llmId = agent?.response_engine?.llm_id
  if (!llmId) throw new Error('no llm_id on agent')

  const lRes = await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!lRes.ok) throw new Error(`get-llm ${lRes.status}: ${await lRes.text()}`)
  const llm = await lRes.json() as any
  const current: string = llm?.general_prompt || ''
  if (!current) throw new Error('empty general_prompt')

  // Prompt: replace the override block in place, or prepend it.
  const newBlock = `${START}\n${CONTENT}\n${END}`
  let nextPrompt: string
  if (current.includes(START) && current.includes(END)) {
    nextPrompt = current.replace(
      current.slice(current.indexOf(START), current.indexOf(END) + END.length),
      newBlock,
    )
  } else {
    nextPrompt = `${newBlock}\n\n${current}`
  }

  // Tools: add save_customer_email if missing (clone an existing custom
  // tool's shape so headers/speak settings stay consistent).
  const tools: any[] = Array.isArray(llm?.general_tools) ? [...llm.general_tools] : []

  // book_appointment learns an optional email arg - the handler uses it
  // as the Cal.com attendee so the invite + Zoom link reach the caller.
  const bookTool = tools.find((t) => t?.type === 'custom' && t?.name === 'book_appointment')
  if (bookTool?.parameters?.properties && !bookTool.parameters.properties.email) {
    bookTool.parameters.properties.email = {
      type: 'string',
      description: "The caller's email address for the calendar invite, exactly as confirmed on the call (e.g. jane@company.com). Omit if the caller declined to give one.",
    }
  }
  const hasEmailTool = tools.some((t) => t?.name === 'save_customer_email')
  if (!hasEmailTool) {
    const template = tools.find((t) => t?.type === 'custom' && t?.name === 'book_appointment') || {}
    tools.push({
      type: 'custom',
      name: 'save_customer_email',
      description: "Save the caller's email address so their demo calendar invite and follow-ups reach them. Call after reading the email back to confirm spelling.",
      url: 'https://cloudgreet.com/api/retell/voice-webhook?action=save_customer_email',
      speak_during_execution: false,
      speak_after_execution: false,
      timeout_ms: template.timeout_ms ?? 10000,
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: "The caller's email address, e.g. jane@company.com" },
          name: { type: 'string', description: "The caller's name, if known" },
        },
        required: ['email'],
      },
    })
  }

  // Safety net: the built-in transfer_call MUST survive every patch. If a
  // previous update dropped it, restore the known-good warm-transfer config.
  if (!tools.some((t) => t?.type === 'transfer_call')) {
    tools.push({
      type: 'transfer_call',
      name: 'transfer_call',
      description: 'Transfer the call to a human agent',
      execution_message_type: 'prompt',
      execution_message_description: '',
      speak_during_execution: true,
      speak_after_execution: true,
      ignore_e164_validation: false,
      custom_sip_headers: {},
      transfer_destination: { type: 'predefined', number: '+17372960092' },
      transfer_option: {
        type: 'warm_transfer',
        opt_out_initial_message: false,
        opt_out_human_detection: false,
        on_hold_music: 'relaxing_sound',
        enable_bridge_audio_cue: false,
        agent_detection_timeout_ms: 30000,
        private_handoff_option: { type: 'prompt', prompt: '' },
        show_transferee_as_caller: false,
      },
    })
    console.log('transfer_call was missing - restored')
  }

  const uRes = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ general_prompt: nextPrompt, general_tools: tools }),
  })
  if (!uRes.ok) throw new Error(`update-llm ${uRes.status}: ${await uRes.text()}`)

  // Post-flight: verify nothing was silently dropped by the API.
  const vRes = await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const after = await vRes.json() as any
  const names = (after?.general_tools || []).map((t: any) => t.name)
  for (const required of ['book_appointment', 'lookup_availability', 'save_customer_email', 'transfer_call', 'end_call']) {
    if (!names.includes(required)) throw new Error(`POST-FLIGHT FAIL: ${required} missing after update - tools now: ${names.join(', ')}`)
  }
  console.log(`patched ✓  llm=${llmId}  prompt ${current.length} → ${nextPrompt.length} chars  tools verified: ${names.join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
