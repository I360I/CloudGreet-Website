/**
 * Give the 5 landing-page demo agents real "(Demo SMS)" texting.
 *
 * - Prompt: idempotent cg:demo_sms block - after a demo booking, offer to
 *   text the confirmation to the caller's own mobile so prospects see the
 *   real customer experience. The webhook enforces the guardrails.
 * - Tool: send_booking_sms schema gains name/service/datetime so the text
 *   has substance.
 * - Post-flight verifies no tool was dropped by the Retell update (the
 *   API has silently eaten tools before - see receptionist patch script).
 *
 * Run: npx tsx --env-file=.env.local scripts/patch-demo-agents-sms.ts
 */

const RETELL_BASE = 'https://api.retellai.com'

const DEMO_LLMS: Record<string, string> = {
  hvac: 'llm_214aeb17028f75853dfa85a1a969',
  electrical: 'llm_3d916e6006748d71a703bca40af1',
  transport: 'llm_85b4d5ef2dc6f5ffd800ad4963a1',
  roofing: 'llm_2667a45da5e981eb5ba9ae9f72b3',
  law: 'llm_ee297c30ab8506936d8cb289b175',
}

const START = '<!-- cg:demo_sms:start -->'
const END = '<!-- cg:demo_sms:end -->'

const CONTENT = `DEMO TEXT MESSAGE (this one is REAL):
- send_booking_sms sends a REAL text message to the caller's mobile. It starts with "(Demo SMS)" and shows the exact booking confirmation text their own customers would receive.
- After you complete a demo booking, always offer it once: "Want me to text you that confirmation, so you can see exactly what your customers would get?"
- If yes: ask for their mobile number, read it back to confirm, then call send_booking_sms with phone, name, service, and datetime (natural words like "Tuesday June 16th at 2 PM" are fine).
- Only ever text the number the caller gives for themselves. One text per conversation. If the tool says one already went out, just point them to their messages.
- If they decline or hesitate, drop it gracefully and move on - never push.`

async function patchOne(vertical: string, llmId: string, apiKey: string) {
  const h = { Authorization: `Bearer ${apiKey}` }
  const llm = await (await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, { headers: h })).json() as any
  const current: string = llm?.general_prompt || ''
  if (!current) throw new Error(`${vertical}: empty general_prompt`)
  const beforeToolNames = (llm.general_tools || []).map((t: any) => t.name).sort()

  const newBlock = `${START}\n${CONTENT}\n${END}`
  const nextPrompt = current.includes(START) && current.includes(END)
    ? current.replace(current.slice(current.indexOf(START), current.indexOf(END) + END.length), newBlock)
    : `${newBlock}\n\n${current}`

  const tools: any[] = Array.isArray(llm?.general_tools) ? [...llm.general_tools] : []
  const sms = tools.find((t) => t?.name === 'send_booking_sms')
  if (sms?.parameters?.properties) {
    const p = sms.parameters.properties
    if (!p.name) p.name = { type: 'string', description: "The caller's name as given during the demo" }
    if (!p.service) p.service = { type: 'string', description: 'What was booked, e.g. "AC tune-up"' }
    if (!p.datetime) p.datetime = { type: 'string', description: 'The booked time in natural words, e.g. "Tuesday June 16th at 2 PM"' }
  }

  const u = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify({ general_prompt: nextPrompt, general_tools: tools }),
  })
  if (!u.ok) throw new Error(`${vertical}: update ${u.status}: ${await u.text()}`)

  // post-flight: no tool may vanish
  const after = await (await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, { headers: h })).json() as any
  const afterToolNames = (after?.general_tools || []).map((t: any) => t.name).sort()
  if (JSON.stringify(beforeToolNames) !== JSON.stringify(afterToolNames)) {
    throw new Error(`${vertical}: POST-FLIGHT FAIL - tools changed: before [${beforeToolNames}] after [${afterToolNames}]`)
  }
  const smsAfter = (after?.general_tools || []).find((t: any) => t.name === 'send_booking_sms')
  const hasParams = !!smsAfter?.parameters?.properties?.datetime
  console.log(`${vertical} ✓  prompt ${current.length} → ${nextPrompt.length}  tools ${afterToolNames.length}  sms params extended: ${hasParams}`)
}

async function main() {
  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) throw new Error('RETELL_API_KEY not set')
  for (const [vertical, llmId] of Object.entries(DEMO_LLMS)) {
    await patchOne(vertical, llmId, apiKey)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
