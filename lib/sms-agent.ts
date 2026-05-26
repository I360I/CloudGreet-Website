/**
 * SMS booking agent.
 *
 * Runs an Anthropic tool-use loop against an inbound SMS, persists the
 * conversation turn-by-turn, and sends the agent's reply back via
 * Telnyx. Same business-level tools as the voice agent (lookup_drive_
 * time, compute_quote, send_dispatch_request) - voice and SMS share
 * the implementations in lib/quote-engine.ts so quoting math stays
 * identical across channels.
 *
 * Conversation context is loaded by (business_id, customer_phone)
 * and capped to the last 24 hours of messages. Older threads reset
 * to a fresh conversation - keeps prompts cheap and avoids stale
 * context bleed.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'
import { telnyxClient } from './telnyx'
import { logger } from './monitoring'
import { lookupDriveTime, computeQuote, sendDispatchRequest } from './quote-engine'

const MODEL = 'claude-sonnet-4-6'
const CONTEXT_WINDOW_HOURS = 24
const MAX_TOOL_LOOPS = 6

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'lookup_drive_time',
    description:
      "Look up real drive time + distance between two addresses including current traffic. ALSO returns origin_county for tax math. Call this before quoting any distance-priced ride.",
    input_schema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Starting address or landmark.' },
        destination: { type: 'string', description: 'Destination address or landmark.' },
        departure_time: { type: 'string', description: "Optional ISO-8601 timestamp for future trips. Omit for 'now'." },
      },
      required: ['origin', 'destination'],
    },
  },
  {
    name: 'compute_quote',
    description:
      "Calculate the EXACT dollar amount including county tax and time surcharges. Always call this before quoting a price. Pull miles + origin_county from lookup_drive_time first.",
    input_schema: {
      type: 'object',
      properties: {
        service_type: { type: 'string', description: 'airport_dropoff | airport_pickup | point_to_point | hourly_event | independent_living' },
        miles: { type: 'number' },
        hours: { type: 'number' },
        pickup_hour_24: { type: 'number' },
        pickup_minute: { type: 'number' },
        origin_county: { type: 'string' },
        cmh_airport: { type: 'boolean' },
      },
      required: ['service_type'],
    },
  },
  {
    name: 'lookup_availability',
    description:
      "Look up open appointment slots on the business's Cal.com calendar. Use to confirm a requested pickup time is actually available before booking. No args = next 7 days; pass `date` (YYYY-MM-DD) to scope to one day.",
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: "Optional ISO date (YYYY-MM-DD) to scope to one day." },
        duration: { type: 'number', description: 'Optional appointment length in minutes. Default 60.' },
      },
    },
  },
  {
    name: 'book_appointment',
    description:
      "Books an appointment on the business's calendar (Cal.com event + DB row, owner notification SMS). Use for customers scheduling FAR ahead (next day or later) when send_dispatch_request isn't appropriate. Pull name + phone + service + datetime (ISO-8601 with timezone offset) from the conversation. For SmartRide, prefer send_dispatch_request unless the customer specifically wants a calendar booking.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Customer's name." },
        phone: { type: 'string', description: 'Customer phone in E.164. Defaults to the SMS sender if omitted.' },
        service: { type: 'string', description: 'Short trip description, e.g., "Airport pickup CMH to OhioHealth".' },
        datetime: { type: 'string', description: 'ISO-8601 start time WITH timezone offset, e.g., "2026-05-27T16:00:00-04:00".' },
        review_consent: { type: 'boolean', description: 'true if the customer agreed to a post-trip review request text.' },
        is_emergency: { type: 'boolean', description: 'true for emergencies. Default false.' },
      },
      required: ['name', 'phone', 'service', 'datetime'],
    },
  },
  {
    name: 'cancel_appointment',
    description:
      "Cancels the customer's existing appointment. Looks up their most recent upcoming booking by phone. Confirm the appointment details with the customer in text BEFORE calling this.",
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Customer phone in E.164. Defaults to the SMS sender if omitted.' },
        reason: { type: 'string', description: 'Optional cancellation reason.' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'reschedule_appointment',
    description:
      "Moves the customer's existing appointment to a new time. Call lookup_availability FIRST. Confirm the new time with the customer in text before firing this.",
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Customer phone in E.164. Defaults to the SMS sender if omitted.' },
        new_datetime: { type: 'string', description: 'New ISO-8601 start time with timezone offset.' },
        reason: { type: 'string' },
      },
      required: ['phone', 'new_datetime'],
    },
  },
  {
    name: 'send_dispatch_request',
    description:
      "Text the owner a summary of an immediate-pickup or near-term request so they can call/text the customer back to confirm. Use this for SmartRide's typical flow - the owner doesn't use a calendar. Don't book a ride yourself.",
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        customer_phone: { type: 'string' },
        pickup: { type: 'string' },
        dropoff: { type: 'string' },
        party_size: { type: 'number' },
        requested_time: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['customer_name', 'customer_phone', 'pickup', 'requested_time'],
    },
  },
]

export async function handleInboundSms(args: {
  businessId: string
  fromPhone: string
  toPhone: string
  body: string
}): Promise<{ ok: true; reply_sent: boolean; reply: string | null } | { ok: false; error: string }> {
  const fromPhone = normalisePhone(args.fromPhone)
  if (!fromPhone) return { ok: false, error: 'bad_from_phone' }

  // Load business config + system prompt.
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, retell_agent_id, dispatch_mode, timezone, phone_number, sms_phone_number')
    .eq('id', args.businessId)
    .maybeSingle()
  if (!biz) return { ok: false, error: 'business_not_found' }

  // Send replies FROM the business's SMS number (must match the
  // number the customer texted, or carriers will reject as
  // unsolicited). Falls back to phone_number if no dedicated SMS
  // number is configured, then to platform notifications.
  const fromNumber = (biz as any).sms_phone_number
    || (biz as any).phone_number
    || process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!fromNumber) return { ok: false, error: 'no_sender_configured' }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return { ok: false, error: 'no_anthropic_key' }
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  // Find or create conversation. Older inactive convos start fresh
  // so we don't pile months of unrelated context into the prompt.
  const conversationId = await getOrCreateConversation(args.businessId, fromPhone)

  // Persist the inbound turn FIRST so even if the agent fails we
  // have a record of what the customer sent.
  await supabaseAdmin.from('sms_agent_messages').insert({
    conversation_id: conversationId,
    business_id: args.businessId,
    direction: 'inbound',
    body: args.body,
  })
  await supabaseAdmin
    .from('sms_conversations')
    .update({ last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  // Load recent history (sliding 24h window).
  const sinceIso = new Date(Date.now() - CONTEXT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data: history } = await supabaseAdmin
    .from('sms_agent_messages')
    .select('direction, body, tool_calls, created_at')
    .eq('conversation_id', conversationId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })

  // Build Anthropic messages array from history.
  const messages: Anthropic.Messages.MessageParam[] = []
  for (const row of (history || []) as any[]) {
    if (row.direction === 'inbound') {
      messages.push({ role: 'user', content: row.body })
    } else if (row.direction === 'outbound') {
      messages.push({ role: 'assistant', content: row.body })
    }
  }
  // Edge case: if no history, the inbound we just inserted was the
  // first row and we need to include it explicitly.
  if (messages.length === 0) {
    messages.push({ role: 'user', content: args.body })
  }

  const systemPrompt = await buildSystemPrompt({
    businessId: args.businessId,
    businessName: (biz as any).business_name || 'us',
    customerPhone: fromPhone,
    timezone: (biz as any).timezone || 'America/New_York',
    dispatchMode: !!(biz as any).dispatch_mode,
  })

  // Tool-use loop.
  let reply: string | null = null
  const collectedToolCalls: any[] = []
  for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    })

    let say = ''
    const toolUses: any[] = []
    for (const block of resp.content) {
      if (block.type === 'text') say += (say ? ' ' : '') + block.text
      if (block.type === 'tool_use') toolUses.push(block)
    }
    messages.push({ role: 'assistant', content: resp.content as any })

    if (toolUses.length === 0) {
      reply = say.trim() || null
      break
    }

    // Run each tool and feed results back.
    const toolResults: any[] = []
    for (const tu of toolUses) {
      const result = await runTool({
        name: tu.name,
        args: tu.input || {},
        businessId: args.businessId,
        retellAgentId: (biz as any).retell_agent_id || null,
        customerPhone: fromPhone,
      })
      collectedToolCalls.push({ name: tu.name, args: tu.input, result })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      })
    }
    messages.push({ role: 'user', content: toolResults })
  }

  if (!reply) {
    reply = "Got it — Steve will get back to you shortly."
  }

  // SMS body length cap. Telnyx will segment longer messages but we
  // want concise replies, so trim with an ellipsis if Claude went long.
  if (reply.length > 1500) reply = reply.slice(0, 1497) + '...'

  // Persist outbound + send via Telnyx.
  let telnyxMessageId: string | null = null
  try {
    const sent = await telnyxClient.sendSMS(fromPhone, reply, fromNumber)
    telnyxMessageId = sent?.data?.id || null
  } catch (e) {
    logger.warn('sms-agent: telnyx send failed', {
      conversationId, error: e instanceof Error ? e.message : 'unknown',
    })
    await supabaseAdmin.from('sms_agent_messages').insert({
      conversation_id: conversationId,
      business_id: args.businessId,
      direction: 'outbound',
      body: `[FAILED TO SEND] ${reply}`,
      tool_calls: collectedToolCalls,
    })
    return { ok: false, error: 'telnyx_send_failed' }
  }

  await supabaseAdmin.from('sms_agent_messages').insert({
    conversation_id: conversationId,
    business_id: args.businessId,
    direction: 'outbound',
    body: reply,
    telnyx_message_id: telnyxMessageId,
    tool_calls: collectedToolCalls.length ? collectedToolCalls : null,
  })
  await supabaseAdmin
    .from('sms_conversations')
    .update({ last_outbound_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return { ok: true, reply_sent: true, reply }
}

async function getOrCreateConversation(businessId: string, customerPhone: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('sms_conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_phone', customerPhone)
    .maybeSingle()
  if ((existing as any)?.id) return (existing as any).id
  const { data: created, error } = await supabaseAdmin
    .from('sms_conversations')
    .insert({ business_id: businessId, customer_phone: customerPhone })
    .select('id')
    .single()
  if (error || !created) throw new Error(`Failed to create conversation: ${error?.message || 'no row'}`)
  return (created as any).id
}

async function buildSystemPrompt(args: {
  businessId: string
  businessName: string
  customerPhone: string
  timezone: string
  dispatchMode: boolean
}): Promise<string> {
  // SmartRide-specific full prompt (matches the live voice prompt's
  // pricing rules) until we wire per-business prompt overrides. The
  // SMS surface keeps the same brand voice and uses the same tools,
  // just optimized for text length.
  const now = new Date()
  const nowLocal = now.toLocaleString('en-US', { timeZone: args.timezone, hour12: false })

  return `You are the AI receptionist for ${args.businessName}, working over SMS.

Current time (local): ${nowLocal}
Customer phone: ${args.customerPhone}

CHANNEL RULES (CRITICAL):
- This is plain SMS. NO markdown - no **bold**, no *italics*, no bullet markers (- * 1.), no code fences. SMS displays markdown as literal characters and looks broken.
- Keep every reply UNDER 320 characters when possible (one SMS segment).
- Never say "on the phone", "on the line", or "press 1". You're texting.
- Don't say "let me put you on hold" or "let me check" - just call the tool and respond with the answer.
- Be warm but brief. The customer wants a quick answer, not a paragraph.
- Numbered/list style is fine but use plain text only: "Pickup address, dropoff, time, how many passengers?" - all on one or two lines.

PRICING (${args.businessName}):
- Airport drop/pickup: $2.75/mile (CMH adds $4.50 airport fee; LCK no fee)
- Point-to-point: $2.75/mile (auto $1.75/mile over 50 miles)
- Hourly/event: $50/hour, 2-hour minimum
- Independent living: $35 hour 1, $15 hour 2, $50/hour after
- Plus county sales tax (Franklin 8%, Delaware 7%, Licking 7.25%, etc.)
- Plus time-of-day surcharge (11pm-12am +10%, 12-2am +15%, 2-4am +20%, 4-5:30am +15%, 5:30-6:45am +10%)

QUOTING RULES:
- NEVER do the math yourself. Always call compute_quote.
- For distance rides: call lookup_drive_time FIRST to get miles + origin county.
- For hourly: ask how many hours, then call compute_quote.

DISPATCH FLOW (DEFAULT for SmartRide - any ride happening today or in the next few hours):
- Don't try to "book" anything in a calendar. Gather: name, pickup, dropoff, when, party size.
- Call send_dispatch_request with the trip details.
- Tell the customer Steve will text/call them shortly to confirm + give the exact ETA.

CALENDAR BOOKING FLOW (only when the customer explicitly wants a scheduled booking ahead of time):
- Call lookup_availability to confirm the requested time is open.
- Confirm name + phone + service + datetime with the customer in text.
- Call book_appointment with ISO-8601 datetime + offset (e.g., "2026-05-28T15:00:00-04:00").
- For SmartRide specifically: this is rare - most rides go through send_dispatch_request.

CHANGES TO EXISTING BOOKINGS:
- Cancel: confirm details with the customer, then call cancel_appointment (it looks up by phone).
- Reschedule: call lookup_availability for the new time first, confirm both old and new with the customer, then reschedule_appointment.

WHAT YOU CAN DO:
- Quote a price (lookup_drive_time + compute_quote)
- Send Steve a dispatch request (send_dispatch_request)
- Check calendar availability (lookup_availability)
- Book / cancel / reschedule calendar appointments
- Answer simple service questions (what kind of rides, service area, etc.)

WHAT YOU CAN'T DO:
- You can't process payments.
- You can't override or change Steve's pricing.

EXAMPLE FLOWS:

[Customer] "Need a ride from CMH to 3310 Morse Road tomorrow 4pm, party of 1"
You: [call lookup_drive_time origin="John Glenn Columbus Airport" destination="3310 Morse Road Columbus OH"]
You: [call compute_quote service_type="airport_pickup" miles=<from lookup> pickup_hour_24=16 origin_county=<from lookup> cmh_airport=true]
You: [call send_dispatch_request with the trip details]
You: "Got it - about $X for CMH to 3310 Morse Rd at 4pm tomorrow. Steve will text you shortly to confirm."

[Customer] "how much for a ride to the airport"
You: "Happy to quote that - what's your pickup address, and is it CMH or LCK?"

[Customer] "stop"
You: (Telnyx handles STOP automatically - don't reply manually)
`.trim()
}

async function runTool(args: {
  name: string
  args: Record<string, any>
  businessId: string
  retellAgentId: string | null
  customerPhone: string
}): Promise<any> {
  // Pure-function tools handled inline - no need for an HTTP round-trip.
  if (args.name === 'lookup_drive_time') {
    return await lookupDriveTime({
      origin: args.args.origin,
      destination: args.args.destination,
      departure_time: args.args.departure_time,
    })
  }
  if (args.name === 'compute_quote') {
    return computeQuote(args.args as any)
  }
  if (args.name === 'send_dispatch_request') {
    return await sendDispatchRequest({
      businessId: args.businessId,
      customerName: String(args.args.customer_name || 'Customer'),
      customerPhone: String(args.args.customer_phone || args.customerPhone),
      pickup: String(args.args.pickup || ''),
      dropoff: args.args.dropoff ? String(args.args.dropoff) : undefined,
      partySize: typeof args.args.party_size === 'number' ? args.args.party_size : undefined,
      requestedTime: String(args.args.requested_time || ''),
      notes: args.args.notes ? String(args.args.notes) : undefined,
    })
  }

  // Everything else (book_appointment, cancel, reschedule, lookup_
  // availability) routes through the existing voice-webhook tool
  // handlers via internal HTTP. The voice-webhook resolves the
  // business by metadata.agent_id and runs the full Cal.com +
  // notification side-effect chain - same code that runs for voice
  // calls, so SMS gets exact parity for free.
  const allowedViaWebhook = new Set([
    'book_appointment', 'cancel_appointment', 'reschedule_appointment',
    'lookup_availability',
  ])
  if (!allowedViaWebhook.has(args.name)) {
    return { ok: false, error: 'unknown_tool', detail: args.name }
  }

  // Inject the SMS sender as the default phone so cancel/reschedule
  // can resolve the customer's existing booking without the agent
  // having to extract a phone from the chat.
  const argsWithDefaults: Record<string, any> = { ...args.args }
  if (!argsWithDefaults.phone) argsWithDefaults.phone = args.customerPhone

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_BASE_URL
    || 'https://cloudgreet.com'

  try {
    const res = await fetch(`${appUrl}/api/retell/voice-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cg-internal-channel': 'sms',
      },
      body: JSON.stringify({
        tool_call: { name: args.name, arguments: argsWithDefaults },
        call: {
          agent_id: args.retellAgentId || '',
          from_number: args.customerPhone,
        },
        metadata: {
          agent_id: args.retellAgentId || '',
          business_id: args.businessId,
          channel: 'sms',
        },
      }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: 'tool_http_error', detail: `${res.status}: ${JSON.stringify(j).slice(0, 200)}` }
    }
    return j
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown'
    logger.warn('sms-agent: voice-webhook tool call failed', {
      tool: args.name, error: detail,
    })
    return { ok: false, error: 'network_error', detail }
  }
}

function normalisePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (raw?.startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return digits ? `+${digits}` : ''
}
