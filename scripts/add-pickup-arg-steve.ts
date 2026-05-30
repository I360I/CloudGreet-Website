/**
 * Add a `pickup` parameter to Steve's book_appointment tool so the agent
 * passes the pickup street address as a structured arg. The server then
 * refuses a ride booking whose pickup is only a city (see the dispatch_mode
 * gate in book_appointment). Without this param the LLM never sends the
 * pickup separately - it was only ever buried in the free-text `service`.
 *
 * Idempotent: re-running leaves an already-present pickup param alone.
 *
 * Run: npx tsx --env-file=.env.local scripts/add-pickup-arg-steve.ts
 */

const RETELL_BASE = 'https://api.retellai.com'
const AGENT_ID = 'agent_97e040eff72c6f2567605c8cc2'

async function main() {
  const key = process.env.RETELL_API_KEY
  if (!key) throw new Error('RETELL_API_KEY not set')
  const h = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

  const agent = await (await fetch(`${RETELL_BASE}/get-agent/${AGENT_ID}`, { headers: h })).json() as any
  const llmId = agent?.response_engine?.llm_id
  const llm = await (await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, { headers: h })).json() as any
  const tools: any[] = llm?.general_tools || []

  const book = tools.find((t) => t.name === 'book_appointment')
  if (!book) throw new Error('book_appointment tool not found')
  book.parameters = book.parameters || { type: 'object', properties: {}, required: [] }
  book.parameters.properties = book.parameters.properties || {}

  if (book.parameters.properties.pickup) {
    console.log('pickup param already present - no change')
    return
  }

  book.parameters.properties.pickup = {
    type: 'string',
    description:
      "The caller's exact pickup street address (house or building number + street, e.g. '1401 Oakwood Avenue, Columbus'). Required for rides. A bare city or town is NOT acceptable - ask for the full street address first. Airports or named places (a hotel, a hospital) are fine.",
  }
  const required: string[] = Array.isArray(book.parameters.required) ? book.parameters.required : []
  if (!required.includes('pickup')) required.push('pickup')
  book.parameters.required = required

  const res = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ general_tools: tools }),
  })
  if (!res.ok) throw new Error(`update-retell-llm ${res.status}: ${await res.text()}`)
  console.log('Added required `pickup` param to book_appointment on llm', llmId)
}

main().catch((e) => { console.error(e); process.exit(1) })
