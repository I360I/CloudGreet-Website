/**
 * Adds the save_customer_email tool to Steve's live Retell LLM and
 * extends the smartride_overrides block in his general_prompt with
 * the email-ask flow:
 *
 *   - If {{has_email_on_file}} == "true" → do NOT ask, never re-ask.
 *   - Else, after a successful booking or dispatch close, ask ONCE
 *     ("last thing - what's a good email to keep on file?") and call
 *     save_customer_email with the answer.
 *
 * Idempotent. The tool insert checks by name; the prompt block uses
 * the cg:smartride_overrides markers we already use.
 */

const RETELL_BASE = 'https://api.retellai.com'
const AGENT_ID = 'agent_97e040eff72c6f2567605c8cc2'

const TOOL_NAME = 'save_customer_email'
const APP_URL = 'https://cloudgreet.com'

const START = '<!-- cg:smartride_overrides:start -->'
const END = '<!-- cg:smartride_overrides:end -->'

const NEW_BLOCK_CONTENT = `SMARTRIDE OVERRIDES (highest priority - these supersede anything below):

- PRICING FLOOR: $50 plus county sales tax is the absolute minimum fare for any ride, no exceptions. Never offer, suggest, or imply a lower price. Do not say things like "I might be willing to do this for less." If the per-mile math comes out below $50, the quote is $50 + tax - full stop. The compute_quote tool already enforces this; read its total back verbatim.
- CAPACITY: The vehicle seats up to 6 passengers (not 5). If a caller asks how many people fit, the answer is six.
- PHONE NUMBER (applies to EVERY flow - booking, callback, and dispatch; supersedes any "default to caller ID" or "use {{user_number}}" instruction below): NEVER default to, assume, or read back the caller ID ({{user_number}}) as the callback number. On forwarded calls it is frequently wrong, and reading back a wrong number sounds broken. Always ask "what's the best number for Steve to reach you?", read back what the caller says to confirm, and pass THAT number to book_appointment, send_dispatch_request, and send_booking_sms. Only fall back to {{user_number}} if the caller flat-out refuses to give one.
- CALLBACK FLOW: When a caller asks for a callback, ask for their name AND the best callback number. Do NOT assume the number from caller ID - on forwarded calls it is frequently wrong, and reading back a wrong number sounds broken. Ask "what's the best number for Steve to reach you?", read back what they say to confirm, and get their name. Never read back a number the caller did not give you.

EMAIL ON FILE:
- Dynamic variable {{has_email_on_file}} is "true" or "false".
- If "true": we already have {{customer_email}}. Do NOT ask for an email. Do NOT mention it unless the caller volunteers a new one. If they do, call save_customer_email with the new value.
- If "false": after the booking confirmation close (or after a successful dispatch / callback close), add ONE small ask: "Last thing - what's a good email to keep on file for Steve?" If they give one, call save_customer_email(email: "<spoken email>") silently and reply with a short "got it." If they decline ("no", "skip it", "not now"), do not push - just close. Do NOT block the booking on the email. Do NOT make this part of the read-back. Do NOT ask for an email on cancel or reschedule flows - those are short interactions.
- Email format: customers will often spell out parts of their email out loud ("at-gmail-dot-com", "underscore", etc). Reconstruct it into standard format before passing to save_customer_email. If the result is unparseable, ask them to spell the part you missed ONCE; if still unclear, move on.`

async function main() {
  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) throw new Error('RETELL_API_KEY not set')

  // Resolve agent -> llm_id.
  const aRes = await fetch(`${RETELL_BASE}/get-agent/${AGENT_ID}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!aRes.ok) throw new Error(`get-agent ${aRes.status}: ${await aRes.text()}`)
  const agent = await aRes.json() as any
  const llmId = agent?.response_engine?.llm_id
  if (!llmId) throw new Error('no llm_id')

  const lRes = await fetch(`${RETELL_BASE}/get-retell-llm/${llmId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!lRes.ok) throw new Error(`get-llm ${lRes.status}: ${await lRes.text()}`)
  const llm = await lRes.json() as any
  const currentPrompt: string = llm?.general_prompt || ''
  const currentTools: any[] = Array.isArray(llm?.general_tools) ? llm.general_tools : []

  // Build/merge tool definition. We use custom_function (Retell's term
  // for "post to a webhook URL"). Steve's other webhook tools already
  // point at /api/retell/voice-webhook so save_customer_email piggybacks
  // on the same dispatcher.
  const toolDef = {
    type: 'custom',
    name: TOOL_NAME,
    description:
      "Save the caller's email to the business's contact memory so future calls/texts don't have to ask again. Call this AFTER the caller gives you their email. The caller's phone is auto-filled from the call - you do not need to pass it.",
    url: `${APP_URL}/api/retell/voice-webhook`,
    speak_during_execution: false,
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Caller email address.' },
        name: { type: 'string', description: "Caller's name if known. Optional." },
      },
      required: ['email'],
    },
  }

  const existingIdx = currentTools.findIndex((t) => t?.name === TOOL_NAME)
  const nextTools = [...currentTools]
  if (existingIdx >= 0) nextTools[existingIdx] = toolDef
  else nextTools.push(toolDef)

  // Replace/insert the smartride_overrides block with the new content.
  const newBlock = `${START}\n${NEW_BLOCK_CONTENT}\n${END}`
  let nextPrompt: string
  const s = currentPrompt.indexOf(START)
  const e = currentPrompt.indexOf(END)
  if (s !== -1 && e !== -1 && e > s) {
    const before = currentPrompt.slice(0, s).replace(/\s+$/, '')
    const after = currentPrompt.slice(e + END.length).replace(/^\s+/, '')
    nextPrompt = [before, newBlock, after].filter(Boolean).join('\n\n')
  } else {
    nextPrompt = `${newBlock}\n\n${currentPrompt}`
  }

  const pRes = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      general_prompt: nextPrompt,
      general_tools: nextTools,
    }),
  })
  if (!pRes.ok) throw new Error(`update-llm ${pRes.status}: ${await pRes.text()}`)
  console.log(`patched ✓  llm=${llmId}  tools ${currentTools.length} → ${nextTools.length}  prompt ${currentPrompt.length} → ${nextPrompt.length} chars`)
}

main().catch((err) => { console.error(err); process.exit(1) })
