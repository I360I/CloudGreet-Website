import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyAdmin } from '@/lib/notifications/notify'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/chat  { messages: [{role:'user'|'assistant', content:string}] }
 *
 * Public AI concierge for the landing page. Answers questions about
 * CloudGreet and can take two actions via tools:
 *   - book_demo: capture a demo request (demo_leads + team notification)
 *   - request_ai_call: have the demo agent call the visitor now (Retell)
 *
 * UNAUTHENTICATED + costs money per message (Anthropic) and per call
 * (Retell), so it is rate-limited per IP + globally via web_chat_log.
 */
const MODEL = 'claude-sonnet-4-6'
const MAX_TURNS = 16          // trailing messages we keep from the client
const MAX_TOOL_LOOPS = 4
const DEMO_FROM = '+18146486307'
const DEMO_AGENT = 'agent_56d7fa8635fdd5313c99729233'

const SYSTEM = `You are the CloudGreet assistant, a warm, concise concierge on the CloudGreet website.

CloudGreet is a 24/7 AI receptionist for service businesses (HVAC, plumbing, electrical, roofing, painting, general contractors, transportation, and most businesses that book work over the phone). It:
- answers every call, day or night, in a natural human-sounding voice
- books jobs straight into the business's calendar
- texts customers back
- handles English and Spanish automatically
- lets the business keep their existing phone number
- is flat monthly with no per-call or per-booking fees
- plugs into Google Calendar, Outlook, Cal.com, and Stripe
- logs every call's transcript and recording in a dashboard

Your goals: answer helpfully and honestly, then help the visitor either (a) book a quick demo, or (b) get our AI to call their phone right now so they can hear it live.

Rules:
- Keep replies short: usually 1-3 sentences. Friendly, no fluff, no emoji.
- Never invent specific pricing. If asked, say it's flat monthly and a quick demo gets exact pricing for their business, then offer to book.
- To book a demo, use the book_demo tool once you have at least a name and email. Ask for a phone and a preferred time if it flows naturally. Confirm warmly after.
- If they want to hear the AI live, use request_ai_call once you have a US phone number.
- Don't over-promise outcomes. If unsure, say the team will follow up.
- Don't discuss internal vendors or tech details. You are CloudGreet.`

const TOOLS: Anthropic.Messages.Tool[] = [
 {
  name: 'book_demo',
  description: "Capture a demo request and notify the CloudGreet team. Use once you have at least the visitor's name and email.",
  input_schema: {
   type: 'object',
   properties: {
    name: { type: 'string', description: "Visitor's name." },
    email: { type: 'string', description: "Visitor's email." },
    phone: { type: 'string', description: 'Optional phone number.' },
    preferred_time: { type: 'string', description: 'Optional preferred day/time for the demo, in their words.' },
    notes: { type: 'string', description: 'Optional: their business type or what they want help with.' },
   },
   required: ['name', 'email'],
  },
 },
 {
  name: 'request_ai_call',
  description: 'Have the CloudGreet demo AI call the visitor right now so they can hear it. Needs a US phone number.',
  input_schema: {
   type: 'object',
   properties: { phone: { type: 'string', description: 'US phone number to call.' } },
   required: ['phone'],
  },
 },
]

function normalizeUsPhone(raw: string): string | null {
 const digits = String(raw || '').replace(/\D/g, '')
 if (digits.length === 10) return '+1' + digits
 if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
 return null
}

async function runTool(name: string, input: any, ip: string): Promise<string> {
 if (name === 'book_demo') {
  if (!input?.name || !input?.email) return 'Need a name and email first.'
  await supabaseAdmin.from('demo_leads').insert({
   name: String(input.name).slice(0, 120),
   email: String(input.email).slice(0, 160),
   phone: input.phone ? String(input.phone).slice(0, 40) : null,
   preferred_time: input.preferred_time ? String(input.preferred_time).slice(0, 120) : null,
   notes: input.notes ? String(input.notes).slice(0, 500) : null,
   source: 'web_chat',
   ip,
  })
  await notifyAdmin({
   type: 'demo.requested',
   severity: 'info',
   title: 'New demo request from the website chat',
   body: `${input.name} <${input.email}>${input.phone ? ' / ' + input.phone : ''}. Preferred: ${input.preferred_time || 'not given'}. Notes: ${input.notes || 'none'}.`,
   metadata: { name: input.name, email: input.email, phone: input.phone || null },
  }).catch(() => {})
  return 'Saved. The team will reach out to confirm a time. Tell the visitor they are booked and someone will follow up shortly.'
 }

 if (name === 'request_ai_call') {
  const to = normalizeUsPhone(input?.phone)
  if (!to) return 'That phone number is not a valid US number. Ask for a 10-digit US number.'
  // 1 demo call per number / 2 min (the chat is a gentler path than the form)
  const recent = await supabaseAdmin
   .from('demo_calls').select('id', { count: 'exact', head: true })
   .eq('phone', to).gte('created_at', new Date(Date.now() - 2 * 60_000).toISOString())
  if ((recent.count || 0) >= 1) return 'We already called that number a moment ago. Ask them to give it a minute.'
  const key = process.env.RETELL_API_KEY
  try {
   const r = await fetch('https://api.retellai.com/v2/create-phone-call', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_number: DEMO_FROM, to_number: to, override_agent_id: DEMO_AGENT }),
   })
   const j = await r.json().catch(() => ({} as any))
   await supabaseAdmin.from('demo_calls').insert({ phone: to, ip, status: r.ok ? 'requested' : 'failed', retell_call_id: j?.call_id || null })
   if (!r.ok) return 'Could not place the call right now. Offer to book a demo instead.'
   return 'Calling them now. Tell the visitor their phone is about to ring and to pick up and talk to it like a real call.'
  } catch {
   return 'Could not place the call right now. Offer to book a demo instead.'
  }
 }
 return 'Unknown tool.'
}

export async function POST(request: NextRequest) {
 const key = process.env.ANTHROPIC_API_KEY
 if (!key) return NextResponse.json({ error: 'Assistant unavailable.' }, { status: 503 })

 const body = await request.json().catch(() => ({} as any))
 const incoming = Array.isArray(body?.messages) ? body.messages : []
 const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'

 // Rate limits (each message is one request).
 const since = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()
 const perIp = await supabaseAdmin.from('web_chat_log').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since(5))
 if ((perIp.count || 0) >= 40) return NextResponse.json({ reply: "Looks like we've chatted a lot just now. Give it a minute, or book a demo and the team will jump in." })
 const global = await supabaseAdmin.from('web_chat_log').select('id', { count: 'exact', head: true }).gte('created_at', since(1440))
 if ((global.count || 0) >= 2000) return NextResponse.json({ reply: 'The assistant is busy right now. Please book a demo and we will reach out.' })
 await supabaseAdmin.from('web_chat_log').insert({ ip })

 // Map + clamp the conversation.
 const messages: Anthropic.Messages.MessageParam[] = incoming
  .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && m.content.trim())
  .slice(-MAX_TURNS)
  .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
 if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
  return NextResponse.json({ error: 'No message.' }, { status: 400 })
 }

 const anthropic = new Anthropic({ apiKey: key })
 try {
  for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
   const resp = await anthropic.messages.create({ model: MODEL, max_tokens: 600, system: SYSTEM, tools: TOOLS, messages })
   if (resp.stop_reason === 'tool_use') {
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
    for (const block of resp.content) {
     if (block.type === 'tool_use') {
      const result = await runTool(block.name, block.input, ip)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
     }
    }
    messages.push({ role: 'assistant', content: resp.content })
    messages.push({ role: 'user', content: toolResults })
    continue
   }
   const text = resp.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text').map((b) => b.text).join('').trim()
   return NextResponse.json({ reply: text || "Happy to help - want me to book you a quick demo?" })
  }
  return NextResponse.json({ reply: 'Want me to book you a quick demo, or have our AI call you to show you live?' })
 } catch (e) {
  logger.error('web chat failed', { error: e instanceof Error ? e.message : 'unknown' })
  return NextResponse.json({ reply: 'Sorry, I hit a snag. You can book a demo and the team will reach out.' })
 }
}
