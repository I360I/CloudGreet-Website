// One-shot: re-publishes general_tools on every live Retell agent so they
// pick up the current tool set (warm_transfer, send_dispatch_request when
// businesses.dispatch_mode is on, etc.).
//
// Usage (run from cloudgreet/):
//   vercel env pull .env.local                    # one time, pulls prod env
//   node --env-file=.env.local scripts/resync-retell-tools.mjs
//   node --env-file=.env.local scripts/resync-retell-tools.mjs <businessId>  # single
//
// Requires env: RETELL_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// IMPORTANT: tool definitions below must stay in sync with
// lib/retell-tools.ts::getRetellGeneralTools. If you change one, change both.

import { createClient } from '@supabase/supabase-js'

const RETELL = process.env.RETELL_API_KEY
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!RETELL || !SUPA_URL || !SUPA_KEY) {
  console.error('Missing env. Need RETELL_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPA_URL, SUPA_KEY)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
const webhookUrl = `${appUrl}/api/retell/voice-webhook`

function normaliseE164(raw) {
  if (!raw || typeof raw !== 'string') return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15 && raw.trim().startsWith('+')) {
    return `+${digits}`
  }
  return null
}

function buildTools({ escalationPhone, dispatchMode }) {
  const tools = [
    {
      type: 'custom', name: 'book_appointment',
      description:
        "Books an appointment on the business's calendar. Call this once you have the caller's name, phone, the service they need, and the date/time they agreed to. Returns success + an appointment id. After it succeeds, follow with send_booking_sms to text the caller a confirmation.",
      url: webhookUrl,
      speak_during_execution: true, speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: "Caller's full name as you'd write it on a calendar event." },
          phone: { type: 'string', description: "Caller's phone number in E.164 if you have it, otherwise as spoken. Default to the inbound caller_id when the caller doesn't provide one." },
          service: { type: 'string', description: "Short description of the job, e.g., 'AC not cooling', 'kitchen sink leak', 'roof inspection'." },
          datetime: { type: 'string', description: "ISO-8601 start time WITH the explicit timezone offset for the business, e.g., '2026-05-14T14:00:00-05:00' for 2 PM Central. MUST include both the date AND the time AND the offset - never pass a date-only string like '2026-05-14', never pass a time without offset like '2026-05-14T14:00:00'. The offset must reflect the contractor's local timezone, not UTC. A missing offset will silently shift the booking by several hours." },
          review_consent: { type: 'boolean', description: "true if the caller explicitly agreed to receive a follow-up review request text after the appointment. Leave false if they declined or you didn't ask." },
          is_emergency: { type: 'boolean', description: "true if this is a true emergency per the business's EMERGENCY_DEFINITION (e.g. no AC in heat with kids/elderly, no heat in freezing weather, water leak / flood, gas smell, sparks, smoke, sewage backup, anything dangerous). When true, the system routes the booking through emergency dispatch. Default false." },
        },
        required: ['name', 'phone', 'service', 'datetime'],
      },
    },
    {
      type: 'custom', name: 'send_booking_sms',
      description:
        "Texts the caller a confirmation SMS with the booked date/time. Call this immediately after book_appointment returns a successful appt_id. Pass the same phone you used to book.",
      url: webhookUrl,
      speak_during_execution: true, speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Same phone number used in the preceding book_appointment call.' },
          appt_id: { type: 'string', description: 'The appointment id returned by book_appointment.' },
        },
        required: ['phone', 'appt_id'],
      },
    },
    {
      type: 'custom', name: 'cancel_appointment',
      description:
        "Cancels the caller's existing appointment on the business's calendar. Look up by the caller's phone number - we'll find their most recent upcoming booking automatically. Confirm the appointment details with the caller out loud BEFORE calling this so you don't cancel the wrong one. Returns success + the cancelled appointment's date/time so you can confirm the cancellation back to the caller.",
      url: webhookUrl,
      speak_during_execution: true, speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: "Caller's phone number in E.164 if available, otherwise as spoken. Default to the inbound caller_id when the caller doesn't provide one - their booking is keyed off this." },
          reason: { type: 'string', description: "Optional. Brief reason the caller gave. Shows up on the contractor's dashboard." },
        },
        required: ['phone'],
      },
    },
    {
      type: 'custom', name: 'reschedule_appointment',
      description:
        "Moves the caller's existing appointment to a new date/time on the business's calendar. Look up by the caller's phone number - we'll find their most recent upcoming booking automatically. ALWAYS call lookup_availability first to confirm the new time is actually open, then confirm BOTH the old and new times with the caller out loud before calling this. Returns success + the new date/time.",
      url: webhookUrl,
      speak_during_execution: true, speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: "Caller's phone number in E.164 if available, otherwise as spoken. Default to the inbound caller_id when the caller doesn't provide one." },
          new_datetime: { type: 'string', description: "ISO-8601 start time with timezone, e.g., '2026-05-21T10:00:00-05:00'. Use the business's timezone, not UTC. Must be in the future." },
          reason: { type: 'string', description: "Optional. Brief reason for the reschedule. Shows up on the contractor's dashboard." },
        },
        required: ['phone', 'new_datetime'],
      },
    },
    {
      type: 'custom', name: 'lookup_availability',
      description:
        "Returns open appointment slots on the business's calendar. Call this BEFORE proposing times to the caller so you only offer slots that are actually free. With no arguments it returns the next 7 days. Pass `date` (YYYY-MM-DD) to scope to a single day.",
      url: webhookUrl,
      speak_during_execution: true, speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: "Optional. ISO date 'YYYY-MM-DD' to scope to one day." },
          duration: { type: 'number', description: 'Optional. Appointment length in minutes. Default 60.' },
        },
      },
    },
  ]

  if (dispatchMode) {
    tools.push({
      type: 'custom', name: 'send_dispatch_request',
      description:
        "Texts the owner a summary of an immediate-pickup / right-now request so they can accept and call the caller back. Use this INSTEAD OF book_appointment when the caller wants service now or in the next couple hours and is not scheduling for a future day. Do not call book_appointment after this - the owner books it themselves once they accept. Tell the caller the owner will text or call them back shortly to confirm.",
      url: webhookUrl,
      speak_during_execution: true, speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: "Caller's name as they gave it." },
          customer_phone: { type: 'string', description: "Caller's phone in E.164 if available, otherwise as spoken. Default to inbound caller_id when not provided." },
          pickup: { type: 'string', description: "Pickup address or location as the caller gave it. For rideshare this is where to pick them up; for mobile services this is the service address." },
          dropoff: { type: 'string', description: "Optional. Dropoff or destination address (rideshare). Leave blank when not applicable." },
          party_size: { type: 'number', description: 'Optional. Number of passengers / people.' },
          requested_time: { type: 'string', description: "When the caller wants service. Use 'now' or 'ASAP' for immediate, or a short phrase like 'in 30 minutes', '7pm tonight'. Plain text - no ISO required." },
          notes: { type: 'string', description: 'Optional. Anything else the owner should know (luggage, kids, accessibility, job description, etc.).' },
        },
        required: ['customer_name', 'customer_phone', 'pickup', 'requested_time'],
      },
    })

    tools.push({
      type: 'custom', name: 'compute_quote',
      description:
        "Calculates the EXACT dollar amount to quote the caller, including county sales tax and any late-night/early-morning surcharge. ALWAYS call this before quoting a price - don't do the math yourself. Returns total_dollars + a spoken_summary.",
      url: webhookUrl,
      speak_during_execution: true, speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          service_type: { type: 'string', description: 'One of: airport_dropoff, airport_pickup, point_to_point, hourly_event, independent_living.' },
          miles: { type: 'number', description: 'Distance in miles for distance-priced services. Pull from lookup_drive_time.' },
          hours: { type: 'number', description: 'Hours of service for hourly services.' },
          pickup_hour_24: { type: 'number', description: 'Pickup hour in 24-hour format (0-23) for the time-of-day surcharge.' },
          pickup_minute: { type: 'number', description: 'Optional pickup minute (0-59). Defaults to 0.' },
          origin_county: { type: 'string', description: "Origin county name without 'County'. e.g., Franklin, Delaware, Licking. Pull from lookup_drive_time.origin_county." },
          cmh_airport: { type: 'boolean', description: 'true if pickup or dropoff is CMH (adds $4.50 fee). False for LCK.' },
        },
        required: ['service_type'],
      },
    })

    tools.push({
      type: 'custom', name: 'lookup_drive_time',
      description:
        "Looks up real drive time + distance between two addresses INCLUDING current traffic. ALSO returns origin_county and is_airport_origin which feed compute_quote. Call this BEFORE compute_quote on any distance-priced ride.",
      url: webhookUrl,
      speak_during_execution: true, speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: "Starting address as the caller gave it, or a landmark name. Plain text - Google geocodes it." },
          destination: { type: 'string', description: 'Destination address or landmark name.' },
          departure_time: { type: 'string', description: "Optional. ISO-8601 timestamp WITH offset for when the trip starts. If omitted, uses 'now'." },
        },
        required: ['origin', 'destination'],
      },
    })
  }

  tools.push({
    type: 'end_call', name: 'end_call',
    description:
      "Ends the call cleanly. Use only when the caller has clearly wrapped up (\"thanks, bye\", \"I gotta go\") or you've already attempted handoff and given a clear next step. Never end while a question is unanswered or the caller is mid-thought.",
  })

  if (escalationPhone) {
    const normalised = normaliseE164(escalationPhone)
    if (normalised) {
      tools.push({
        type: 'transfer_call', name: 'transfer_call',
        description:
          "Warm-transfers the caller to the owner's number. Use only when the caller explicitly asks for a human, when there's a true emergency that needs a person on the line, or after multiple booking attempts have failed. Don't transfer just because the caller is skeptical or a slot is taken. Retell does human detection - the caller is only bridged once a real person picks up; if the dial goes to voicemail or no-answer, the call comes back to you and you should offer to take a message.",
        transfer_destination: { type: 'predefined', number: normalised },
        transfer_option: {
          type: 'warm_transfer',
          private_handoff_option: {
            type: 'prompt',
            prompt:
              "Briefly announce yourself in one sentence, starting with 'CloudGreet transfer.' Then summarize who is calling and why in plain words. Example: 'CloudGreet transfer. John on the line, his AC stopped cooling.' Keep it under 12 words.",
          },
        },
      })
    }
  }

  return tools
}

async function resyncOne(businessId, name) {
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, business_name, retell_agent_id, escalation_phone, notifications_phone, owner_id, dispatch_mode')
    .eq('id', businessId)
    .maybeSingle()
  if (!biz?.retell_agent_id) {
    console.log(`  skip ${name}: no retell_agent_id`)
    return
  }
  let phone = biz.escalation_phone || biz.notifications_phone
  if (!phone && biz.owner_id) {
    const { data: owner } = await supabase
      .from('custom_users').select('phone').eq('id', biz.owner_id).maybeSingle()
    phone = owner?.phone || null
  }

  const aRes = await fetch(`https://api.retellai.com/get-agent/${biz.retell_agent_id}`, {
    headers: { Authorization: `Bearer ${RETELL}` },
  })
  if (!aRes.ok) { console.log(`  ${name}: get-agent ${aRes.status}`); return }
  const agent = await aRes.json()
  const engine = agent?.response_engine?.type
  const llmId = agent?.response_engine?.llm_id
  if (engine !== 'retell-llm' || !llmId) {
    console.log(`  ${name}: engine=${engine} (not retell-llm) - can't patch via API`)
    return
  }
  const tools = buildTools({ escalationPhone: phone, dispatchMode: Boolean(biz.dispatch_mode) })
  const pRes = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${RETELL}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ general_tools: tools }),
  })
  if (!pRes.ok) {
    const txt = await pRes.text()
    console.log(`  ${name}: update-retell-llm ${pRes.status} - ${txt.slice(0, 200)}`)
    return
  }
  console.log(`  ${name}: ok (${tools.length} tools, transfer=${phone || 'none'}, dispatch=${biz.dispatch_mode ? 'on' : 'off'})`)
}

const onlyId = process.argv[2]
let businesses
if (onlyId) {
  const r = await supabase.from('businesses').select('id, business_name').eq('id', onlyId)
  businesses = r.data
} else {
  const r = await supabase
    .from('businesses')
    .select('id, business_name')
    .not('retell_agent_id', 'is', null)
  businesses = r.data
}

console.log(`Resyncing ${businesses?.length || 0} agents...`)
for (const b of (businesses || [])) {
  await resyncOne(b.id, b.business_name)
}
console.log('Done.')
