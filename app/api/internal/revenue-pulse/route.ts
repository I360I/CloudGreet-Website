import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/internal/revenue-pulse
 *
 * Single source of truth for "cash collected" in the daily pulse. Reads
 * billing_history (written by the Stripe webhook on every paid invoice
 * AND every one-time checkout) so the number reflects real money, not
 * recurring MRR. Recurring-only views (getStripeMrrSummary) deliberately
 * exclude one-time setup fees; this endpoint includes everything paid.
 *
 * Auth: the scheduled routine sends the cron secret. We accept either
 * `Authorization: Bearer ${CRON_SECRET}` (matches the app's other crons)
 * or `x-cron-secret: ${CRON_SECRET}` (matches digest-relay), so whichever
 * header the routine already uses works.
 *
 * Returns dollar amounts (billing_history.amount is stored in dollars).
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  const bearer = request.headers.get('authorization') === `Bearer ${secret}`
  const headerSecret = request.headers.get('x-cron-secret') === secret
  return bearer || headerSecret
}

type Bucket = { totalCents: number; count: number }

function emptyBucket(): Bucket {
  return { totalCents: 0, count: 0 }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowMs = Date.now()
  const since24hIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString()
  // Month-to-date in UTC. The pulse is a rough founder-facing heartbeat,
  // so UTC month boundaries are fine; we don't need business-local months.
  const now = new Date(nowMs)
  const monthStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  // Pull paid rows since the start of the month (the widest window we
  // report). 24h is a subset, computed in-memory. Volume is tiny at this
  // stage, so one query + JS aggregation beats two round-trips or an RPC.
  const { data, error } = await supabaseAdmin
    .from('billing_history')
    .select('amount, billing_type, created_at')
    .eq('status', 'paid')
    .gte('created_at', monthStartIso)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('revenue-pulse query failed', { error: error.message })
    return NextResponse.json({ error: 'query_failed', detail: error.message }, { status: 500 })
  }

  const rows = data || []
  const mtd = emptyBucket()
  const last24h = emptyBucket()
  const byType: Record<string, number> = {}

  for (const row of rows) {
    // amount is stored in dollars; convert to cents for exact math, round
    // back to dollars at the edge so we never emit floating-point dust.
    const cents = Math.round(((row.amount as number) || 0) * 100)
    if (cents <= 0) continue
    mtd.totalCents += cents
    mtd.count += 1
    const type = (row.billing_type as string) || 'unknown'
    byType[type] = (byType[type] || 0) + cents
    if ((row.created_at as string) >= since24hIso) {
      last24h.totalCents += cents
      last24h.count += 1
    }
  }

  const dollars = (cents: number) => Math.round(cents) / 100

  return NextResponse.json({
    generatedAt: now.toISOString(),
    currency: 'USD',
    last24h: { collected: dollars(last24h.totalCents), payments: last24h.count },
    monthToDate: {
      collected: dollars(mtd.totalCents),
      payments: mtd.count,
      byType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, dollars(v)]),
      ),
    },
  })
}
