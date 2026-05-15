import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { buildBusinessContext } from '@/lib/agent-builder/build-context'
import { createSession, sendAndStream } from '@/lib/agent-builder/managed-agent-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // chat turns can run long with web_fetch

/**
 * POST /api/admin/agents-due/[closeId]/chat
 *   body: { message: string, reset?: boolean }
 *   response: text/event-stream
 *
 * Multi-turn chat with the prompt-generator managed agent for one close.
 * Reuses the same session across turns (stored on
 * closes.agent_chat_session_id) so the admin can iterate naturally
 * ("make it warmer", "swap the name to Cole", "add weekend hours").
 *
 * If reset=true, throws away the existing session and creates a new one.
 * The first message of a brand-new session is augmented server-side with
 * the close's business context so the agent doesn't have to ask twenty
 * questions.
 *
 * Returns server-sent events:
 *   data: { "type":"text", "text":"..." }
 *   data: { "type":"tool_use", "name":"web_fetch", "input":"..." }
 *   data: { "type":"tool_result", "name":"web_fetch", "ok":true }
 *   data: { "type":"thinking", "text":"..." }
 *   data: { "type":"error", "message":"..." }
 *   data: { "type":"session", "session_id":"..." }
 *   data: { "type":"done" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    })
  }

  const body = await request.json().catch(() => ({})) as { message?: string; reset?: boolean }
  const userMessage = (body.message || '').trim()
  if (!userMessage) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    })
  }

  // 1) Resolve / create the session for this close.
  const { data: close, error: closeErr } = await supabaseAdmin
    .from('closes')
    .select('id, business_id, agent_chat_session_id, prospect_business_name, prospect_contact_name, prospect_phone, prospect_email, website')
    .eq('id', params.closeId)
    .maybeSingle()
  if (closeErr || !close) {
    return new Response(JSON.stringify({ error: 'close not found' }), {
      status: 404, headers: { 'content-type': 'application/json' },
    })
  }

  // Pull the linked business row (if any) so we have website + address +
  // services + business_hours to seed buildBusinessContext.
  let linkedBiz: any = null
  if ((close as any).business_id) {
    const { data: b } = await supabaseAdmin
      .from('businesses')
      .select('business_name, address, services, business_hours, website, phone, phone_number, owner_name, city, state')
      .eq('id', (close as any).business_id)
      .maybeSingle()
    linkedBiz = b
  }

  // Also pull the original lead row (if rep created the close from a
  // scrape) - scrape data lives there: rating, review count, place_id,
  // and the owner_name when the scraper found one.
  let linkedLead: any = null
  if ((close as any).business_id) {
    const { data: l } = await supabaseAdmin
      .from('leads')
      .select('contact_name, website, business_name, city, state, google_rating, google_review_count, business_type, address, notes')
      .eq('business_id', (close as any).business_id)
      .maybeSingle()
    linkedLead = l
  } else if ((close as any).prospect_phone) {
    // Pre-conversion path: match by phone since there's no business_id
    // to key off yet. Otherwise the workshop chat fires with zero
    // scrape context even though we already have it on the lead.
    const { data: l } = await supabaseAdmin
      .from('leads')
      .select('contact_name, website, business_name, city, state, google_rating, google_review_count, business_type, address, notes')
      .eq('phone', (close as any).prospect_phone)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    linkedLead = l
  }

  let sessionId = body.reset ? null : (close as any).agent_chat_session_id as string | null
  let isFreshSession = false
  if (!sessionId) {
    try {
      sessionId = await createSession()
      isFreshSession = true
      await supabaseAdmin
        .from('closes')
        .update({ agent_chat_session_id: sessionId, updated_at: new Date().toISOString() })
        .eq('id', params.closeId)
    } catch (e) {
      logger.error('chat: createSession failed', {
        closeId: params.closeId, error: e instanceof Error ? e.message : 'Unknown',
      })
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Could not create session' }), {
        status: 500, headers: { 'content-type': 'application/json' },
      })
    }
  }

  // 2) On the first turn of a new session, prepend rich business context
  //    so the agent has everything it needs (and the user can just say
  //    "go" or hand-edit details). Subsequent turns are sent as-is.
  let outboundText = userMessage
  if (isFreshSession) {
    let contextBlock = ''
    try {
      const ctx = await buildBusinessContext({
        business_name:
          linkedBiz?.business_name ||
          linkedLead?.business_name ||
          (close as any).prospect_business_name ||
          undefined,
        owner_name:
          linkedBiz?.owner_name ||
          linkedLead?.contact_name ||
          (close as any).prospect_contact_name ||
          undefined,
        phone:
          linkedBiz?.phone ||
          linkedBiz?.phone_number ||
          (close as any).prospect_phone ||
          undefined,
        address:
          linkedBiz?.address ||
          linkedLead?.address ||
          [linkedBiz?.city, linkedBiz?.state].filter(Boolean).join(', ') ||
          undefined,
        website:
          linkedBiz?.website ||
          (close as any).website ||
          linkedLead?.website ||
          undefined,
        services: Array.isArray(linkedBiz?.services) ? linkedBiz.services : undefined,
        business_hours: linkedBiz?.business_hours || undefined,
      } as any)
      contextBlock = stringifyContext(ctx)
    } catch (ctxErr) {
      logger.warn('chat: buildBusinessContext failed; sending message without context', {
        error: ctxErr instanceof Error ? ctxErr.message : 'Unknown',
      })
    }

    // Pull live DB extras the prompt generator can use to tailor the
    // agent prompt + KB. These are inert nudges - the agent can ignore
    // them if not useful.
    const dbExtras = await collectDbExtras(close.business_id)

    outboundText = [
      '# Context — CloudGreet close',
      '',
      `**Close ID:** ${close.id}`,
      `**Business ID:** ${close.business_id ?? '(not linked yet)'}`,
      `**Prospect business name:** ${(close as any).prospect_business_name ?? '-'}`,
      `**Prospect contact:** ${(close as any).prospect_contact_name ?? '-'}`,
      `**Prospect phone:** ${(close as any).prospect_phone ?? '-'}`,
      `**Prospect email:** ${(close as any).prospect_email ?? '-'}`,
      '',
      contextBlock ? `## Pre-fetched website / GMB context\n${contextBlock}` : '',
      dbExtras ? `## CloudGreet DB extras\n${dbExtras}` : '',
      '---',
      '## Admin instructions',
      userMessage,
    ].filter(Boolean).join('\n')
  }

  // 3) Stream the agent response back as SSE.
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      try {
        send({ type: 'session', session_id: sessionId, fresh: isFreshSession })
        for await (const chunk of sendAndStream(sessionId!, outboundText)) {
          send(chunk)
          if (chunk.type === 'done' || chunk.type === 'error') break
        }
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : 'Stream failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}

/**
 * DELETE /api/admin/agents-due/[closeId]/chat
 *
 * Forget the current session for this close. Next POST will create
 * a fresh one with full business context prepended again.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    })
  }

  await supabaseAdmin
    .from('closes')
    .update({ agent_chat_session_id: null, updated_at: new Date().toISOString() })
    .eq('id', params.closeId)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' },
  })
}

function stringifyContext(ctx: any): string {
  if (!ctx) return ''
  // Generous trim - prompt generator only needs signal-rich excerpts.
  try {
    const compact = {
      seed: ctx.seed,
      website_summary: ctx.website?.summary || ctx.website?.text?.slice(0, 2000),
      pages: Array.isArray(ctx.website?.pages)
        ? ctx.website.pages.map((p: any) => ({
            url: p.url,
            title: p.title,
            excerpt: (p.text || '').slice(0, 800),
          }))
        : undefined,
      google_places: ctx.google_places,
    }
    return '```yaml\n' + JSON.stringify(compact, null, 2) + '\n```'
  } catch {
    return ''
  }
}

async function collectDbExtras(businessId: string | null | undefined): Promise<string> {
  if (!businessId) return ''
  const lines: string[] = []
  try {
    const [{ data: kb }, { data: calls }, { data: appts }] = await Promise.all([
      supabaseAdmin
        .from('business_knowledge_entries')
        .select('title, content')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('calls')
        .select('summary, customer_phone, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('appointments')
        .select('customer_name, service_type, scheduled_date')
        .eq('business_id', businessId)
        .order('scheduled_date', { ascending: false })
        .limit(5),
    ])

    if (kb && kb.length > 0) {
      lines.push('### Knowledge base entries')
      for (const k of kb) {
        lines.push(`- **${k.title}**: ${(k.content || '').slice(0, 300)}`)
      }
    }
    if (calls && calls.length > 0) {
      lines.push('\n### Recent call summaries (last 5)')
      for (const c of calls) {
        if (c.summary) lines.push(`- ${c.summary.slice(0, 200)}`)
      }
    }
    if (appts && appts.length > 0) {
      lines.push('\n### Recent appointments (last 5)')
      for (const a of appts) {
        lines.push(`- ${a.customer_name} — ${a.service_type ?? 'service'} on ${a.scheduled_date}`)
      }
    }
  } catch (e) {
    logger.warn('chat: collectDbExtras failed', { error: e instanceof Error ? e.message : 'Unknown' })
  }
  return lines.join('\n')
}
