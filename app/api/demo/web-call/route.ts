import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Public (unauthenticated) endpoint that mints a Retell WebRTC web-call
 * token so a landing visitor can talk to a DEMO agent in-browser.
 *
 * Uses dedicated demo agents only - never a real client's agent - so no
 * real calendars get written and no owner SMS fire. Rate-limited per IP
 * because each web call is real, billable Retell time.
 *
 * One demo agent per business vertical. For the prototype every vertical
 * points at the existing "CloudGreet Receptionist" demo agent; per-vertical
 * personas get their own agent ids here as we build them out.
 */
const DEMO_AGENTS: Record<string, string> = {
  default: 'agent_56d7fa8635fdd5313c99729233',
  carservice: 'agent_56d7fa8635fdd5313c99729233',
  hvac: 'agent_56d7fa8635fdd5313c99729233',
  electrical: 'agent_56d7fa8635fdd5313c99729233',
  dentist: 'agent_56d7fa8635fdd5313c99729233',
  lawyer: 'agent_56d7fa8635fdd5313c99729233',
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon'
  // 5 web calls per IP per 10 min - generous for trying a few desks,
  // tight enough that nobody racks up Retell minutes on us.
  if (!rateLimit(`demo-web-call:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
  }

  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) {
    logger.error('demo web-call: RETELL_API_KEY missing')
    return NextResponse.json({ error: 'config' }, { status: 500 })
  }

  let vertical = 'default'
  try {
    const body = await req.json()
    if (body?.vertical && typeof body.vertical === 'string') vertical = body.vertical
  } catch { /* no body is fine */ }
  const agentId = DEMO_AGENTS[vertical] || DEMO_AGENTS.default

  try {
    const r = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId }),
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      logger.error('create-web-call failed', { status: r.status, body: t.slice(0, 200) })
      return NextResponse.json({ error: 'web_call_failed' }, { status: 502 })
    }
    const d = await r.json()
    return NextResponse.json({ access_token: d.access_token, call_id: d.call_id, vertical })
  } catch (e) {
    logger.error('demo web-call error', { error: e instanceof Error ? e.message : 'unknown' })
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
