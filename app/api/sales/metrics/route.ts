import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { geolocate, jitter } from '@/lib/geo/us-geo'

/** Full state names keyed by USPS code - matches public/geo/us-states.json. */
const STATE_NAME_BY_CODE: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}
const STATE_CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_BY_CODE).map(([code, name]) => [name.toLowerCase(), code]),
)

/** Normalize a lead's state field ("OH" / "ohio" / " Ohio ") to a full name. */
function stateName(state?: string | null, _phone?: string | null): string | null {
  const raw = (state || '').trim()
  if (!raw) return null
  if (raw.length === 2) return STATE_NAME_BY_CODE[raw.toUpperCase()] || null
  const code = STATE_CODE_BY_NAME[raw.toLowerCase()]
  return code ? STATE_NAME_BY_CODE[code] : null
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/metrics?range=7|30|90
 *
 * The rep's full analytics payload in one round-trip. Everything is
 * scoped to the caller and the requested rolling window (except
 * pipeline status counts and owed, which are point-in-time).
 *
 *   activity   - dials/connects/conversations/talk by day + totals
 *   hours      - per-hour-of-day histogram (best call window)
 *   funnel     - lead statuses now + demo set/held/won + rates
 *   money      - earned by day (+cumulative), owed, mrr, avg deal
 *   efficiency - dials per demo, connects per demo, demos per 100 dials
 *   days       - per-day table rows (date, dials, connects, rate, talk, demos, earned)
 *   map        - territory: home (Austin HQ), demo + client points,
 *                per-state lead counts (point-in-time)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  try {
    const rangeDays = [7, 30, 90].includes(Number(request.nextUrl.searchParams.get('range')))
      ? Number(request.nextUrl.searchParams.get('range'))
      : 30
    const since = new Date(Date.now() - rangeDays * 86_400_000)
    const sinceIso = since.toISOString()

    const [callsRes, assignsRes, closesRes, ledgerRes, owedRes] = await Promise.all([
      supabaseAdmin
        .from('rep_calls')
        .select('status, duration_seconds, started_at')
        .eq('rep_id', auth.userId)
        .gte('started_at', sinceIso)
        .or('direction.eq.outbound,direction.is.null')
        .limit(20000),
      supabaseAdmin
        .from('lead_assignments')
        .select('status, touch_count, follow_up_at, last_touched_at, lead_id')
        .eq('rep_id', auth.userId)
        .limit(5000),
      supabaseAdmin
        .from('closes')
        .select('id, status, demo_scheduled_at, demo_result, agreed_monthly_cents, created_at, prospect_business_name, prospect_phone, business_id')
        .eq('rep_id', auth.userId)
        .not('status', 'in', '("cancelled","rejected")')
        .limit(1000),
      supabaseAdmin
        .from('commission_ledger')
        .select('commission_cents, earned_at, source_type')
        .eq('rep_id', auth.userId)
        .gte('earned_at', sinceIso)
        .limit(5000),
      supabaseAdmin
        .from('commission_ledger')
        .select('commission_cents')
        .eq('rep_id', auth.userId)
        .is('payout_id', null)
        .limit(5000),
    ])

    const calls = callsRes.data || []
    const assigns = assignsRes.data || []
    const closes = closesRes.data || []
    const ledger = ledgerRes.data || []

    // ---- per-day + per-hour activity ----
    const dayKey = (iso: string) => iso.slice(0, 10)
    const days = new Map<string, { dials: number; connects: number; conversations: number; talk: number; earned: number; demos: number }>()
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      days.set(d.toISOString().slice(0, 10), { dials: 0, connects: 0, conversations: 0, talk: 0, earned: 0, demos: 0 })
    }
    const hours = Array.from({ length: 24 }, () => ({ dials: 0, connects: 0 }))

    let totDials = 0, totConnects = 0, totConvos = 0, totTalk = 0, totNoAns = 0, totVm = 0
    for (const c of calls as any[]) {
      const k = dayKey(c.started_at)
      const bucket = days.get(k)
      const dur = c.duration_seconds || 0
      const isConnect = c.status === 'completed' && dur > 30
      const isConvo = c.status === 'completed' && dur >= 15
      totDials++
      if (isConnect) totConnects++
      if (isConvo) totConvos++
      if (c.status === 'no_answer') totNoAns++
      if (c.status === 'voicemail') totVm++
      totTalk += dur
      if (bucket) {
        bucket.dials++
        if (isConnect) bucket.connects++
        if (isConvo) bucket.conversations++
        bucket.talk += dur
      }
      const h = new Date(c.started_at).getHours()
      hours[h].dials++
      if (isConnect) hours[h].connects++
    }

    // ---- funnel ----
    const statusCounts: Record<string, number> = {}
    for (const a of assigns as any[]) statusCounts[a.status || 'new'] = (statusCounts[a.status || 'new'] || 0) + 1
    const demosSetRange = (closes as any[]).filter((c) => c.demo_scheduled_at && c.demo_scheduled_at >= sinceIso)
    for (const d of demosSetRange) {
      const b = days.get(dayKey(d.demo_scheduled_at))
      if (b) b.demos++
    }
    const withResult = (closes as any[]).filter((c) => c.demo_result && c.demo_result !== 'pending')
    const held = withResult.filter((c) => ['won', 'lost', 'needs_followup', 'reschedule'].includes(c.demo_result)).length
    const noShow = withResult.filter((c) => ['no_show', 'ghosted'].includes(c.demo_result)).length
    const won = (closes as any[]).filter((c) => c.demo_result === 'won' || c.status === 'paid').length
    const paid = (closes as any[]).filter((c) => c.status === 'paid')
    const avgDeal = paid.length > 0 ? paid.reduce((s, c: any) => s + (c.agreed_monthly_cents || 0), 0) / paid.length : 0

    // ---- money ----
    let cum = 0
    for (const r of ledger as any[]) {
      const b = days.get(dayKey(r.earned_at))
      if (b) b.earned += r.commission_cents || 0
    }
    const earnedSeries = Array.from(days.entries()).map(([date, v]) => {
      cum += v.earned
      return { date, earned: v.earned, cumulative: cum }
    })
    const earnedTotal = (ledger as any[]).reduce((s, r) => s + (r.commission_cents || 0), 0)
    const owed = ((owedRes.data || []) as any[]).reduce((s, r) => s + (r.commission_cents || 0), 0)

    // ---- territory map ----
    // Home base is always CloudGreet HQ in Austin. Demo/client points
    // geolocate from the linked business first, then the prospect's
    // phone area code.
    const home = { lat: 30.2672, lng: -97.7431 }

    const bizIds = (closes as any[]).map((c) => c.business_id).filter(Boolean)
    const bizById = new Map<string, any>()
    if (bizIds.length > 0) {
      const { data: bizRows } = await supabaseAdmin
        .from('businesses')
        .select('id, city, state, phone_number')
        .in('id', bizIds.slice(0, 500))
      for (const b of bizRows || []) bizById.set(b.id, b)
    }
    type MapPt = { id: string; name: string; lat: number; lng: number; kind: 'demo' | 'client' }
    const mapPoints: MapPt[] = []
    for (const c of closes as any[]) {
      const biz = c.business_id ? bizById.get(c.business_id) : null
      const loc = geolocate({ city: biz?.city, state: biz?.state, phone: biz?.phone_number || c.prospect_phone })
      if (!loc) continue
      const [lat, lng] = jitter(loc[0], loc[1], String(c.id))
      mapPoints.push({
        id: c.id,
        name: c.prospect_business_name || 'Prospect',
        lat, lng,
        kind: c.status === 'paid' ? 'client' : 'demo',
      })
    }

    // Territory shading = the rep's assigned leads counted per state,
    // keyed by full state name to match the public geojson. Choropleth
    // beats a heat cloud: it reads like a sales dashboard, not a game.
    const leadIds = (assigns as any[]).map((a) => a.lead_id).filter(Boolean).slice(0, 2000)
    const stateCounts: Record<string, number> = {}
    for (let i = 0; i < leadIds.length; i += 500) {
      const { data: leadRows } = await supabaseAdmin
        .from('leads')
        .select('id, state, phone')
        .in('id', leadIds.slice(i, i + 500))
      for (const l of leadRows || []) {
        const name = stateName(l.state, l.phone)
        if (name) stateCounts[name] = (stateCounts[name] || 0) + 1
      }
    }

    const demosSetCount = demosSetRange.length
    return NextResponse.json({
      success: true,
      range: rangeDays,
      activity: {
        dials: totDials,
        connects: totConnects,
        connect_rate: totDials > 0 ? totConnects / totDials : 0,
        conversations: totConvos,
        talk_seconds: totTalk,
        no_answers: totNoAns,
        voicemails: totVm,
        avg_call_seconds: totConnects > 0 ? Math.round(totTalk / totConnects) : 0,
      },
      hours: hours.map((h, i) => ({ hour: i, ...h })),
      funnel: {
        statuses: statusCounts,
        demos_set: demosSetCount,
        demos_held: held,
        no_shows: noShow,
        won,
        show_rate: held + noShow > 0 ? held / (held + noShow) : null,
        win_rate: held > 0 ? won / held : null,
      },
      money: {
        earned_cents: earnedTotal,
        owed_cents: owed,
        avg_deal_cents: Math.round(avgDeal),
        paid_closes: paid.length,
        series: earnedSeries,
      },
      efficiency: {
        dials_per_demo: demosSetCount > 0 ? Math.round(totDials / demosSetCount) : null,
        connects_per_demo: demosSetCount > 0 ? Math.round(totConnects / demosSetCount) : null,
        demos_per_100_dials: totDials > 0 ? Math.round((demosSetCount / totDials) * 100 * 10) / 10 : null,
      },
      map: { home, points: mapPoints, states: stateCounts },
      days: Array.from(days.entries()).map(([date, v]) => ({
        date,
        dials: v.dials,
        connects: v.connects,
        rate: v.dials > 0 ? Math.round((v.connects / v.dials) * 100) : 0,
        talk_seconds: v.talk,
        demos: v.demos,
        earned_cents: v.earned,
      })),
    })
  } catch (e) {
    logger.error('sales metrics failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
