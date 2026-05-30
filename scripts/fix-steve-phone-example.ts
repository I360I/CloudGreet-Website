/**
 * Fix the caller-ID read-back bug on Steve's live agent.
 *
 * Root cause: the "Phone numbers (spoken)" section of his Retell prompt used
 * a REAL phone number (737-296-0092, the admin number) as the pronunciation
 * example. When reading a caller's number back, the model recited the example
 * digits instead of speaking {{user_number}}, so every caller heard the same
 * wrong number. {{user_number}} itself is populated correctly (bookings
 * captured real caller IDs) - this is purely prompt contamination.
 *
 * Fix: swap the real number for the fictional 555-0123 placeholder everywhere
 * in that section, and add one line stating the example is format-only and the
 * agent must speak the actual digits of {{user_number}}.
 *
 * Run: npx tsx --env-file=.env.local scripts/fix-steve-phone-example.ts
 */

const RETELL_BASE = 'https://api.retellai.com'
const AGENT_ID = 'agent_97e040eff72c6f2567605c8cc2'

const SPOKEN_OLD = 'seven three seven, two nine six, zero zero nine two'
const SPOKEN_NEW = 'five five five, zero one two three'
const HYPHEN_OLD = '7-3-7-2-9-6-0-0-9-2'
const HYPHEN_NEW = '5-5-5-0-1-2-3'

// Augment the canonical ✅ example line with an explicit "speak the real
// number" instruction so the model stops emitting the example as a value.
const RIGHT_LINE_OLD = `- ✅ Right: "${SPOKEN_NEW}" (natural digit groups)`
const RIGHT_LINE_NEW = `- ✅ Right: "${SPOKEN_NEW}" (natural digit groups). This is ONLY a formatting example. When reading a caller's number back, speak the ACTUAL digits of {{user_number}}, grouped this way - never read these example digits.`

async function main() {
  const key = process.env.RETELL_API_KEY
  if (!key) throw new Error('RETELL_API_KEY not set')
  const h = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

  const agent = await (await fetch(`${RETELL_BASE}/get-agent/${AGENT_ID}`, { headers: h })).json() as any
  const llmId = agent?.response_engine?.llm_id
  const llm = await (await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, { headers: h })).json() as any
  const current: string = llm?.general_prompt || ''
  if (!current) throw new Error('empty general_prompt')

  const spokenHits = current.split(SPOKEN_OLD).length - 1
  const hyphenHits = current.split(HYPHEN_OLD).length - 1
  console.log(`occurrences -> spoken "${SPOKEN_OLD}": ${spokenHits}, hyphen "${HYPHEN_OLD}": ${hyphenHits}`)

  let next = current.split(SPOKEN_OLD).join(SPOKEN_NEW)
  next = next.split(HYPHEN_OLD).join(HYPHEN_NEW)
  // Augment the ✅ Right line (now using the placeholder) once.
  if (next.includes(RIGHT_LINE_OLD)) {
    next = next.replace(RIGHT_LINE_OLD, RIGHT_LINE_NEW)
    console.log('augmented the ✅ Right example line with a speak-the-real-number note')
  } else {
    console.log('WARN: could not find the ✅ Right line to augment (format may have changed)')
  }

  if (next === current) {
    console.log('no change - nothing matched')
    return
  }
  if (next.includes('737') || next.includes('seven three seven')) {
    console.log('WARN: a 737 reference still remains in the prompt - check manually')
  }

  const res = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ general_prompt: next }),
  })
  if (!res.ok) throw new Error(`update-retell-llm ${res.status}: ${await res.text()}`)
  console.log('\nDone. Patched general_prompt on llm', llmId)
  console.log('The real number 737-296-0092 is no longer in the prompt; example is now 555-0123.')
}

main().catch((e) => { console.error(e); process.exit(1) })
