/**
 * Read-only: dump Steve's live Retell agent + LLM config to find where the
 * callback number comes from. Looking for a phone dynamic variable and any
 * hardcoded default (e.g. +17372960092) that would be read back instead of
 * the real caller ID. Nothing is changed.
 *
 * Run: npx tsx --env-file=.env.local scripts/probe-steve-agent-prompt.ts
 */

const RETELL_BASE = 'https://api.retellai.com'
const AGENT_ID = 'agent_97e040eff72c6f2567605c8cc2'

async function main() {
  const key = process.env.RETELL_API_KEY
  if (!key) throw new Error('RETELL_API_KEY not set')
  const h = { Authorization: `Bearer ${key}` }

  const agent = await (await fetch(`${RETELL_BASE}/get-agent/${AGENT_ID}`, { headers: h })).json()
  const llmId = agent?.response_engine?.llm_id
  console.log('=== AGENT top-level keys ===')
  console.log(Object.keys(agent).join(', '))
  console.log('\n=== begin_message ===')
  console.log(agent?.begin_message || '(none)')
  console.log('\n=== agent default_dynamic_variables ===')
  console.log(JSON.stringify(agent?.default_dynamic_variables || agent?.dynamic_variables || null, null, 2))

  const llm = await (await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, { headers: h })).json()
  console.log('\n=== LLM keys ===')
  console.log(Object.keys(llm).join(', '))
  console.log('\n=== LLM default_dynamic_variables ===')
  console.log(JSON.stringify(llm?.default_dynamic_variables || null, null, 2))

  const prompt: string = llm?.general_prompt || ''
  console.log('\n=== general_prompt: lines mentioning phone / number / callback / {{ ===')
  prompt.split('\n').forEach((line, i) => {
    if (/phone|number|callback|\{\{|737|reach you/i.test(line)) {
      console.log(`${i + 1}: ${line}`)
    }
  })

  // Hunt for the literal admin number anywhere in the serialized config.
  const blob = JSON.stringify({ agent, llm })
  console.log('\n=== contains "7372960092"? ===', blob.includes('7372960092'))
  console.log('=== contains "737-296"? ===', blob.includes('737-296'))
}

main().catch((e) => { console.error(e); process.exit(1) })
