/**
 * Taza Downtown Cleveland demo fix (Jul 30 test call): the agent texted the
 * OpenTable reservation link twice in one call - once for "text me the
 * reservation link", again a turn later while deflecting a wait-time
 * question per the prompt's own Type 2 instruction ("use send_link with the
 * reservation link"). No check anywhere for "did I already send this."
 *
 * Scoped to Taza ONLY for now (not the shared restaurant tool set in
 * lib/retell-tools.ts, not other restaurant demos) per instruction - prove
 * it out here before touching anything shared.
 *
 * Idempotent via cg:link_dedupe markers. Verifies no tools were eaten by
 * the Retell PATCH (known API bug - see scripts/patch-smartride-booking-polish.ts).
 * Run:
 *   npx tsx --env-file=.env.local scripts/patch-taza-link-dedup.ts
 */
const RETELL = 'https://api.retellai.com'
const AGENT_ID = 'agent_2b8bfa453f00d1b073514c9a06'
const START = '<!-- cg:link_dedupe:start -->'
const END = '<!-- cg:link_dedupe:end -->'
const ANCHOR_AFTER = 'Just say something natural like "Okay, that\'s on its way, you\'ll see it come through in a sec," and keep going.'

const BLOCK = `${START}
DON'T RESEND A LINK YOU ALREADY SENT THIS CALL: before calling send_link, think back over this same call. If you already texted this exact link (menu, reservation, or ordering) earlier in the conversation, do NOT call send_link again for it - just say something natural like "that link should already be in your texts" or "I sent that one over already, you should see it come through." Only send it again if the caller says they didn't get it or directly asks you to resend it.
${END}`

function upsertBlock(prompt: string, block: string, anchorAfter: string): string {
  const s = prompt.indexOf(START)
  const e = prompt.indexOf(END)
  if (s !== -1 && e !== -1) {
    return prompt.slice(0, s) + block + prompt.slice(e + END.length)
  }
  const a = prompt.indexOf(anchorAfter)
  if (a === -1) throw new Error('anchor text not found - prompt may have changed, aborting rather than guessing where to insert')
  const insertAt = a + anchorAfter.length
  return prompt.slice(0, insertAt) + '\n\n' + block + prompt.slice(insertAt)
}

async function main() {
  const rh = { Authorization: `Bearer ${process.env.RETELL_API_KEY}`, 'Content-Type': 'application/json' }

  const agent: any = await (await fetch(`${RETELL}/get-agent/${AGENT_ID}`, { headers: rh })).json()
  const llmId = agent?.response_engine?.llm_id
  if (!llmId) throw new Error('could not resolve llm_id from agent: ' + JSON.stringify(agent).slice(0, 200))
  const llm: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: rh })).json()
  const beforeTools = (llm.general_tools || []).map((t: any) => t.name).sort()

  const newPrompt = upsertBlock(llm.general_prompt, BLOCK, ANCHOR_AFTER)
  const up = await fetch(`${RETELL}/update-retell-llm/${llmId}`, {
    method: 'PATCH', headers: rh, body: JSON.stringify({ general_prompt: newPrompt }),
  })
  if (!up.ok) throw new Error('update failed: ' + (await up.text()).slice(0, 300))

  // Post-flight: the Retell PATCH has eaten tools before - verify.
  const after: any = await (await fetch(`${RETELL}/get-retell-llm/${llmId}`, { headers: rh })).json()
  const afterTools = (after.general_tools || []).map((t: any) => t.name).sort()
  if (JSON.stringify(beforeTools) !== JSON.stringify(afterTools)) {
    throw new Error(`TOOLS CHANGED! before=${beforeTools} after=${afterTools} - restore needed`)
  }
  console.log('patched:', llm.general_prompt.length, '->', after.general_prompt.length, 'chars | tools intact:', afterTools.length)
  console.log('block present:', after.general_prompt.includes(START) && after.general_prompt.includes(END))
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
