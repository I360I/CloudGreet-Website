import { NextRequest, NextResponse } from 'next/server'
import { handleWebChat } from '@/lib/sms-agent'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/embed/chat  { businessId, name, phone, message }
 *
 * Public, cross-origin chat endpoint for the embeddable website widget
 * (public/widget.js -> /embed/[businessId]). Runs the tenant's AI receptionist
 * (handleWebChat: same brain as the SMS agent) and returns a single reply.
 * The browser holds nothing but name + phone; conversation history lives in
 * Supabase keyed by (businessId, phone), so each POST only sends the latest
 * message.
 *
 * UNAUTHENTICATED and costs money per message (Anthropic), so it is rate
 * limited per IP (web_chat_log) and per visitor phone (inside handleWebChat).
 * CORS is open because it is embedded on arbitrary customer domains.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const since = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

function normUsPhone(raw: unknown): string | null {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  return null
}

function json(obj: any, status = 200) {
  return NextResponse.json(obj, { status, headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const body = await request.json().catch(() => null)
  if (!body) return json({ error: 'Invalid request.' }, 400)

  const businessId = String(body.businessId || '').trim()
  const name = String(body.name || '').trim().slice(0, 80)
  const phone = normUsPhone(body.phone)
  const message = String(body.message || '').trim().slice(0, 1500)

  if (!businessId) return json({ error: 'Missing businessId.' }, 400)
  if (!phone) return json({ error: 'A valid US mobile number is required.' }, 400)
  if (!message) return json({ error: 'Message is empty.' }, 400)

  // Per-IP throttle (reuses the landing chat's web_chat_log table).
  try {
    const { count } = await supabaseAdmin
      .from('web_chat_log')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', since(5))
    if ((count || 0) >= 25) return json({ error: 'Too many messages. Give it a minute.' }, 429)
    await supabaseAdmin.from('web_chat_log').insert({ ip }).then(() => {}, () => {})
  } catch { /* if the log table is unavailable, fall through to the phone-level limit */ }

  try {
    const res = await handleWebChat({ businessId, customerPhone: phone, customerName: name || undefined, body: message })
    if (res.ok) return json({ reply: res.reply })
    const err = (res as { error: string }).error
    if (err === 'rate_limited') return json({ error: 'You are sending messages too fast. One moment.' }, 429)
    if (err === 'business_not_found') return json({ error: 'Chat is not set up for this site yet.' }, 404)
    logger.warn('embed chat handler failed', { error: err, businessId })
    return json({ error: 'Chat is unavailable right now. Please try again shortly.' }, 502)
  } catch (e) {
    logger.error('embed chat error', { error: e instanceof Error ? e.message : 'unknown', businessId })
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
