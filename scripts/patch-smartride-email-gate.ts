/**
 * Fix 7 (cheap mitigation) for the double-booking bug: make the agent
 * collect the email BEFORE it books, so it never books-without-email then
 * re-books-with-email (which is what created duplicate appointments before
 * the dedupe fix landed). Patches Steve's Retell voice LLM general_prompt
 * AND his agent_sms_prompt (the SMS + web-chat brain share this prompt).
 *
 * Idempotent via cg:book_email_gate markers. Verifies no tools were eaten
 * by the Retell PATCH. Goes through update-retell-llm (live for this
 * agent); do NOT re-save through the admin builder afterward or it clobbers.
 * Run:
 *   npx tsx --env-file=.env.local scripts/patch-smartride-email-gate.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const RETELL = 'https://api.retellai.com'
const AGENT_ID = 'agent_97e040eff72c6f2567605c8cc2'
const BIZ_ID = '650406c3-5585-446e-958d-0fbcccf54795'
const START = '<!-- cg:book_email_gate:start -->'
const END = '<!-- cg:book_email_gate:end -->'
const ANCHOR = '<!-- cg:steve_booking_polish:end -->'

const VOICE_BLOCK = `${START}
EMAIL BEFORE BOOKING (do not skip, this overrides anything looser): never call book_appointment until you have ALL FOUR of the caller's name, mobile number, the date and time, AND their email. If the email is the only thing missing, ask for it before you book: "What email should I put on the reservation so Steve can send the confirmation?" The ONLY exception is a caller who explicitly declines to give an email - then say you'll note that and book without it. Never book first and ask for the email after; collect it, then book once.
${END}`

const SMS_BLOCK = `${START}
EMAIL BEFORE BOOKING (do not skip, this overrides anything looser): never call book_appointment until you have ALL FOUR of the customer's name, mobile number, the date and time, AND their email. If the email is the only thing still missing, ask for it before booking ("What email should Steve send the confirmation to?"). The ONLY exception is a customer who explicitly declines to give an email - note that and book without it. Never book first and then ask for the email; collect it, then book once.
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
  if (!llmId) throw new Error('could not resolve llm_id from agent')
  const llm: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: rh })).json()
  const beforeTools = (llm.general_tools || []).map((t: any) => t.name).sort()

  const newVoice = upsertBlock(llm.general_prompt, VOICE_BLOCK, ANCHOR)
  const up = await fetch(`${RETELL}/update-retell-llm/${llmId}`, {
    method: 'PATCH', headers: rh, body: JSON.stringify({ general_prompt: newVoice }),
  })
  if (!up.ok) throw new Error('voice update failed: ' + (await up.text()).slice(0, 200))

  const after: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: rh })).json()
  const afterTools = (after.general_tools || []).map((t: any) => t.name).sort()
  if (JSON.stringify(beforeTools) !== JSON.stringify(afterTools)) {
    throw new Error(`TOOLS CHANGED! before=${beforeTools} after=${afterTools} - restore needed`)
  }
  console.log('voice patched:', llm.general_prompt.length, '->', after.general_prompt.length, 'chars | tools intact:', afterTools.length)

  // ---- SMS + WEB CHAT (shared agent_sms_prompt) ----
  const { data: biz } = await supabase.from('businesses').select('agent_sms_prompt').eq('id', BIZ_ID).single()
  const newSms = upsertBlock(biz!.agent_sms_prompt, SMS_BLOCK, ANCHOR)
  const { error } = await supabase.from('businesses')
    .update({ agent_sms_prompt: newSms, updated_at: new Date().toISOString() })
    .eq('id', BIZ_ID)
  if (error) throw error
  console.log('sms patched:', biz!.agent_sms_prompt.length, '->', newSms.length, 'chars')
  console.log('\nDONE. Email-before-booking gate live on voice + SMS + web chat.')
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
