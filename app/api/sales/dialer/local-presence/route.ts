import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { listRepNumbers, orderRepNumber } from '@/lib/telnyx/rep-numbers'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/sales/dialer/local-presence
 *   body: { area_codes: [{ code: '512', count: 12 }, ...] }
 *
 * Called by the cockpit when a call session starts: makes sure the
 * rep's number pool covers the session's top area codes so the
 * engine's per-call local-presence matcher can switch caller IDs
 * automatically (Austin leads ring from a 512, Dallas from a 214...).
 *
 * COST GUARDRAILS (local DIDs are ~$1/mo each):
 *   - pool cap stays 3 local numbers per rep (existing eviction reuses
 *     slots; old numbers are RELEASED at Telnyx, not stockpiled)
 *   - at most 2 new orders per session start
 *   - only area codes with >= 2 leads in the queue get a number bought
 *   - exact-area-code only: no inventory in that NPA = skip, never buy
 *     a random-area number
 *   - area codes the session needs are protected from eviction
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    area_codes?: { code?: string; count?: number }[]
  }
  const requested = (body.area_codes || [])
    .map((a) => ({ code: String(a.code || '').replace(/\D/g, '').slice(0, 3), count: Number(a.count) || 0 }))
    .filter((a) => a.code.length === 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3) // pool cap is 3 - more codes than that can never all fit

  if (requested.length === 0) {
    return NextResponse.json({ error: 'area_codes required' }, { status: 400 })
  }

  const pool = (await listRepNumbers(auth.userId)).filter((n) => !n.is_sms_line)
  const npaOf = (e164: string) => e164.replace(/\D/g, '').replace(/^1/, '').slice(0, 3)

  // Numbers that already cover a requested code must survive eviction.
  const protectNumbers = pool
    .filter((n) => requested.some((r) => r.code === npaOf(n.phone_number)))
    .map((n) => n.phone_number)

  const results: { code: string; status: 'covered' | 'ordered' | 'skipped'; number?: string; reason?: string }[] = []
  let ordersPlaced = 0
  const MAX_ORDERS_PER_SESSION = 2
  const MIN_LEADS_TO_BUY = 2

  for (const req of requested) {
    const existing = pool.find((n) => npaOf(n.phone_number) === req.code)
    if (existing) {
      results.push({ code: req.code, status: 'covered', number: existing.phone_number })
      continue
    }
    if (req.count < MIN_LEADS_TO_BUY) {
      results.push({ code: req.code, status: 'skipped', reason: `only ${req.count} lead(s) - not worth a number` })
      continue
    }
    if (ordersPlaced >= MAX_ORDERS_PER_SESSION) {
      results.push({ code: req.code, status: 'skipped', reason: 'session order limit (2) reached' })
      continue
    }
    const ordered = await orderRepNumber(auth.userId, {
      areaCode: req.code,
      label: `Local presence (${req.code})`,
      exactAreaCodeOnly: true,
      protectNumbers,
    })
    if (ordered.ok === true) {
      ordersPlaced += 1
      protectNumbers.push(ordered.created.phone_number)
      results.push({ code: req.code, status: 'ordered', number: ordered.created.phone_number })
      logger.info('local-presence: number ordered for session', {
        repId: auth.userId, code: req.code, number: ordered.created.phone_number,
        evicted: ordered.evicted?.phone_number || null,
      })
    } else {
      results.push({ code: req.code, status: 'skipped', reason: ordered.error })
    }
  }

  return NextResponse.json({ success: true, results, orders_placed: ordersPlaced })
}
