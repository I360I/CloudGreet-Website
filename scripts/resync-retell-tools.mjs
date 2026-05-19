// One-shot: re-publishes general_tools on every live Retell agent so they
// pick up the new warm_transfer + private_handoff_option whisper.
//
// Usage (run from cloudgreet/):
//   vercel env pull .env.local                    # one time, pulls prod env
//   node --env-file=.env.local scripts/resync-retell-tools.mjs
//
// Requires env: RETELL_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

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

// Mirror of getRetellGeneralTools(). Kept inline so this script doesn't
// have to import TS / Next.js. Update both if you change the tool set.
function buildTools(escalationPhone) {
  const tools = [
    customTool('book_appointment',
      "Books an appointment via Cal.com. Call after you've confirmed name/phone/service and a workable slot.",
      {
        customer_name: 'string', customer_phone: 'string', customer_email: 'string',
        service_type: 'string', address: 'string', notes: 'string',
        start_time: 'string', end_time: 'string',
        is_emergency: 'boolean', review_consent: 'boolean',
      }),
    customTool('lookup_availability',
      "Looks up open Cal.com slots near a requested window so you can offer real options.",
      {
        preferred_window: 'string', start_after: 'string', end_before: 'string',
      }),
    customTool('send_booking_sms',
      "Texts the caller a booking confirmation. Only after book_appointment succeeded.",
      {
        customer_phone: 'string', message: 'string',
      }),
    customTool('cancel_appointment',
      "Cancels an existing appointment by Cal.com booking uid.",
      { cal_com_booking_uid: 'string' }),
    customTool('reschedule_appointment',
      "Reschedules an existing appointment to a new slot.",
      {
        cal_com_booking_uid: 'string', new_start_time: 'string', new_end_time: 'string',
      }),
    { type: 'end_call', name: 'end_call',
      description: "Ends the call cleanly. Use only when the caller has clearly wrapped up." },
  ]
  if (escalationPhone) {
    const normalised = normaliseE164(escalationPhone)
    if (normalised) {
      tools.push({
        type: 'transfer_call',
        name: 'transfer_call',
        description:
          "Warm-transfers the caller to the owner's number. Retell does human detection - the caller is only bridged once a real person picks up; if the dial goes to voicemail or no-answer, the call comes back to you and you should offer to take a message.",
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

function customTool(name, description, params) {
  const properties = {}
  for (const [k, t] of Object.entries(params)) properties[k] = { type: t }
  return {
    type: 'custom', name, description,
    speak_during_execution: true, speak_after_execution: true,
    url: `${webhookUrl}?action=${name}`,
    parameters: { type: 'object', properties, required: [] },
  }
}

async function resyncOne(businessId, name) {
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, business_name, retell_agent_id, escalation_phone, notifications_phone, owner_id')
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
  const tools = buildTools(phone)
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
  console.log(`  ${name}: ok (${tools.length} tools, transfer=${phone || 'none'})`)
}

const { data: businesses } = await supabase
  .from('businesses')
  .select('id, business_name')
  .not('retell_agent_id', 'is', null)

console.log(`Resyncing ${businesses?.length || 0} agents...`)
for (const b of (businesses || [])) {
  await resyncOne(b.id, b.business_name)
}
console.log('Done.')
