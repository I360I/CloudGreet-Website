/**
 * One-off: surgical patches to Steve's (Smart Ride Central Ohio) live Retell
 * prompt covering three corrections he flagged after testing:
 *
 *   1. $50 minimum fare floor — never offer below $50 (+ county tax). The
 *      quote engine now enforces this server-side; this block makes sure
 *      the agent doesn't verbally hedge ("might be willing to do less").
 *   2. Callback flow — agent was announcing it would ask for name AND
 *      callback number, then only asking for the name. The callback number
 *      is auto-collected from caller-id; only ask for the name.
 *   3. Capacity is up to 6 passengers, not 5.
 *
 * Idempotent: re-running replaces the block in place. Run with:
 *   npx tsx scripts/patch-smartride-prompt.ts
 */

const RETELL_BASE = 'https://api.retellai.com'
const AGENT_ID = 'agent_97e040eff72c6f2567605c8cc2'

const START = '<!-- cg:smartride_overrides:start -->'
const END = '<!-- cg:smartride_overrides:end -->'

const CONTENT = `SMARTRIDE OVERRIDES (highest priority — these supersede anything below):

- PRICING FLOOR: $50 plus county sales tax is the absolute minimum fare for any ride, no exceptions. Never offer, suggest, or imply a lower price. Do not say things like "I might be willing to do this for less." If the per-mile math comes out below $50, the quote is $50 + tax — full stop. The compute_quote tool already enforces this; read its total back verbatim.
- CAPACITY: The vehicle seats up to 6 passengers (not 5). If a caller asks how many people fit, the answer is six.
- CALLBACK FLOW: When a caller asks for a callback, the only thing you need to ask is their name. The callback number is automatically captured from the line they are calling from. Confirm the captured number by reading it back ("can Steve call you back at [number]?") and ask their name. Do NOT announce that you will ask for two things or ask them to recite their phone number.`

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

  const newBlock = `${START}\n${CONTENT}\n${END}`

  let next: string
  const s = current.indexOf(START)
  const e = current.indexOf(END)
  if (s !== -1 && e !== -1 && e > s) {
    const before = current.slice(0, s).replace(/\s+$/, '')
    const after = current.slice(e + END.length).replace(/^\s+/, '')
    next = [before, newBlock, after].filter(Boolean).join('\n\n')
  } else {
    next = `${newBlock}\n\n${current}`
  }

  if (next === current) {
    console.log('no change')
    return
  }

  const pRes = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ general_prompt: next }),
  })
  if (!pRes.ok) throw new Error(`update-llm ${pRes.status}: ${await pRes.text()}`)
  console.log(`patched ✓  llm=${llmId}  prompt ${current.length} → ${next.length} chars`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
