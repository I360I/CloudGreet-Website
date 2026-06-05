/**
 * Prepend a highest-priority caller-ID + emergency override to live agents.
 *
 * Generated prompts still default the callback number to {{user_number}}
 * (caller ID) and read it back - wrong on forwarded/voicemail calls. And
 * emergency tiers still try a transfer first (voicemail dead-end). This
 * prepends an override block that supersedes both. Idempotent via markers.
 *
 * Run: npx tsx --env-file=.env.local scripts/patch-caller-id-override.ts
 */

const RETELL_BASE = 'https://api.retellai.com'

const AGENTS: Array<[string, string]> = [
  ['Beltz', 'agent_303d50bad6a261dd4f7239f344'],
  ['Jacks', 'agent_36cd2604eab997ae0068af9fa1'],
  ['Elite', 'agent_e495d9d880693537e87faeccfd'],
]

const START = '<!-- cg:caller_id_override:start -->'
const END = '<!-- cg:caller_id_override:end -->'

const OVERRIDE = `${START}
# PHONE NUMBER - HIGHEST PRIORITY (supersedes any "default to caller ID", "pass {{user_number}}", or "confirm the callback number" instruction below)
NEVER default to, assume, or read back the caller ID ({{user_number}}) as the callback number. On forwarded or voicemail calls it is frequently wrong, and reading back a wrong number sounds broken ("where are you getting that number?"). Always ASK "what's the best number to reach you?", then read back what the CALLER says to confirm, digit by digit. Pass the number the caller GAVE you to book_appointment, send_booking_sms, cancel_appointment, and any dispatch or transfer. Only fall back to {{user_number}} if the caller flat-out refuses to give a number. Do NOT open with "I've got your callback number as [X]" using the caller ID - ask first.

# EMERGENCY - book, never dead-end
For a true emergency, give a brief safety line if dangerous (gas: leave the area, no switches or flames; if anyone is in danger, 911), get the address, ASK for the callback number, then book the soonest slot with book_appointment and is_emergency: true. This dispatches a tech and fires the urgent owner alert. Do NOT take a message or offer a callback. Only transfer if a live-answer line is configured; if a transfer hits voicemail or fails, immediately book with is_emergency: true instead.
${END}`

async function patchAgent(name: string, agentId: string, key: string) {
  const h = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  const agent = await (await fetch(`${RETELL_BASE}/get-agent/${agentId}`, { headers: h })).json() as any
  const llmId = agent?.response_engine?.llm_id
  if (!llmId) { console.log(`${name}: no llm_id, skipping`); return }
  const llm = await (await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, { headers: h })).json() as any
  const current: string = llm?.general_prompt || ''
  if (!current) { console.log(`${name}: empty prompt, skipping`); return }

  let next: string
  const s = current.indexOf(START)
  const e = current.indexOf(END)
  if (s !== -1 && e !== -1 && e > s) {
    next = current.slice(0, s) + OVERRIDE + current.slice(e + END.length)
  } else {
    next = `${OVERRIDE}\n\n${current}`
  }
  if (next === current) { console.log(`${name}: no change`); return }

  const res = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH', headers: h, body: JSON.stringify({ general_prompt: next }),
  })
  if (!res.ok) { console.log(`${name}: update failed ${res.status}: ${(await res.text()).slice(0, 200)}`); return }
  console.log(`${name}: patched ✓ (${current.length} -> ${next.length} chars)`)
}

async function main() {
  const key = process.env.RETELL_API_KEY
  if (!key) throw new Error('RETELL_API_KEY not set')
  for (const [name, id] of AGENTS) await patchAgent(name, id, key)
}

main().catch((e) => { console.error(e); process.exit(1) })
