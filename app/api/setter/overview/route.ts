import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { getRepCallStats, getRepDailySeries, getWeeklyDemoGoalStatus } from '@/lib/sales/dialer-stats'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/setter/overview?range=today|week|all
 *
 * Setter-only (not shared with 'sales' via REP_TOOL_ROLES - this is the
 * one surface that's genuinely specific to the setter role). Feeds
 * /setter's Overview page: today's + this week's call activity, plus
 * lead-pipeline counts so a setter can see their queue and their
 * headline output metric (demos booked).
 *
 * `range` shapes the hero chart's `series`: today = hourly over the
 * last 24h, week (default) = daily over 7 days, all = weekly buckets
 * back to the setter's first call (capped at 26 weeks).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'setter') {
    return NextResponse.json({ error: 'Setter role required' }, { status: 401 })
  }
  const rangeParam = new URL(request.url).searchParams.get('range')
  const range: 'today' | 'week' | 'all' =
    rangeParam === 'today' || rangeParam === 'all' ? rangeParam : 'week'

  try {
    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const weekStart = new Date(todayStart)
    weekStart.setUTCDate(weekStart.getUTCDate() - 6) // rolling 7-day window incl. today

    const [today, week, dailyCalls, goalRow] = await Promise.all([
      getRepCallStats(auth.userId, { since: todayStart }),
      getRepCallStats(auth.userId, { since: weekStart }),
      getRepDailySeries(auth.userId, 7),
      // Defensive: sql/setter-weekly-goal.sql may not be applied yet on
      // every environment. Fall back to the default goal (2) rather than
      // 500ing the whole page if the column doesn't exist.
      supabaseAdmin.from('custom_users').select('weekly_demo_goal').eq('id', auth.userId).maybeSingle()
        .then((r) => r, () => ({ data: null, error: null })),
    ])
    const weeklyGoalTarget = (goalRow as any)?.data?.weekly_demo_goal ?? 2

    const { data: assignments } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id, status, last_touched_at, follow_up_at')
      .eq('rep_id', auth.userId)

    const rows = (assignments || []) as any[]

    // "Up next" - a short call-priority list for the Overview page.
    // DUE CALLBACKS FIRST (follow_up_at in the past, incl. auto-pins
    // from missed inbound return calls - the hottest leads there are),
    // ordered soonest-promised first, then the least-recently-touched
    // new/interested fill. Manual join (lead_assignments.lead_id has no
    // declared FK to leads(id) - same pattern as
    // app/api/sales/leads/route.ts).
    const nowIso = new Date().toISOString()
    const isDialable = (r: any) => r.status !== 'dead' && r.status !== 'do_not_call'
    const dueCallbacks = rows
      .filter((r) => isDialable(r) && r.follow_up_at && r.follow_up_at <= nowIso)
      .sort((a, b) => (a.follow_up_at || '').localeCompare(b.follow_up_at || ''))
    const callbacksDue = dueCallbacks.length
    const dueIds = new Set(dueCallbacks.map((r) => r.lead_id))
    const fill = rows
      .filter((r) => (r.status === 'new' || r.status === 'interested') && !dueIds.has(r.lead_id))
      .sort((a, b) => (a.last_touched_at || '').localeCompare(b.last_touched_at || ''))
    const upNextCandidates = [...dueCallbacks.slice(0, 8), ...fill].slice(0, Math.max(5, Math.min(8, callbacksDue)))
    const upNextIds = upNextCandidates.map((r) => r.lead_id).filter(Boolean)
    let upNext: { id: string; business_name: string | null; phone: string | null; status: string; due?: boolean }[] = []
    if (upNextIds.length > 0) {
      const { data: leadRows } = await supabaseAdmin
        .from('leads')
        .select('id, business_name, phone')
        .in('id', upNextIds)
      const byId = new Map((leadRows || []).map((l: any) => [l.id, l]))
      upNext = upNextCandidates
        .map((r) => {
          const lead = byId.get(r.lead_id)
          if (!lead?.phone) return null
          return {
            id: lead.id, business_name: lead.business_name || null, phone: lead.phone, status: r.status,
            due: !!(r.follow_up_at && r.follow_up_at <= nowIso),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    }
    const counts = {
      total: rows.length,
      new: rows.filter((r) => r.status === 'new').length,
      interested: rows.filter((r) => r.status === 'interested').length,
      dead_or_dnc: rows.filter((r) => r.status === 'dead' || r.status === 'do_not_call').length,
    }
    const demosScheduledSince = (since: Date) => rows.filter((r) =>
      r.status === 'demo_scheduled' && r.last_touched_at && r.last_touched_at >= since.toISOString(),
    ).length

    // Same "current status" quirk as demos_booked_today/week above: a
    // demo counts on the day it was last touched while still in
    // demo_scheduled status, not a durable historical log.
    const demosByDay = new Map<string, number>()
    for (const r of rows) {
      if (r.status !== 'demo_scheduled' || !r.last_touched_at) continue
      const key = String(r.last_touched_at).slice(0, 10)
      demosByDay.set(key, (demosByDay.get(key) || 0) + 1)
    }
    const daily = dailyCalls.map((d) => ({ ...d, demos: demosByDay.get(d.date) || 0 }))
    const weeklyGoal = await getWeeklyDemoGoalStatus(auth.userId, weeklyGoalTarget)

    // Hero-chart series for the requested range. Points carry an ISO
    // `key` the client formats in the viewer's timezone.
    let series: { range: string; points: { key: string; dials: number; connects: number; demos: number }[]; demos_total: number }
    const demoRows = rows.filter((r) => r.status === 'demo_scheduled' && r.last_touched_at)
    if (range === 'today') {
      // Rolling last 24 hours, hourly buckets (avoids UTC-midnight
      // weirdness for reps in other timezones).
      const startHour = new Date(now)
      startHour.setUTCMinutes(0, 0, 0)
      startHour.setUTCHours(startHour.getUTCHours() - 23)
      const points = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(startHour.getTime() + i * 3600e3)
        return { key: d.toISOString(), dials: 0, connects: 0, demos: 0 }
      })
      const idx = (iso: string) => Math.floor((new Date(iso).getTime() - startHour.getTime()) / 3600e3)
      const { data: calls } = await supabaseAdmin
        .from('rep_calls')
        .select('status, started_at, duration_seconds')
        .eq('rep_id', auth.userId)
        .gte('started_at', startHour.toISOString())
      for (const c of (calls || []) as any[]) {
        const i = idx(c.started_at)
        if (i < 0 || i > 23) continue
        points[i].dials += 1
        if (c.status === 'completed' && (c.duration_seconds || 0) > 30) points[i].connects += 1
      }
      for (const r of demoRows) {
        const i = idx(r.last_touched_at)
        if (i >= 0 && i <= 23) points[i].demos += 1
      }
      series = { range, points, demos_total: points.reduce((s, p) => s + p.demos, 0) }
    } else if (range === 'all') {
      // Weekly buckets back to the first call (min 4, max 26 weeks).
      const { data: firstCall } = await supabaseAdmin
        .from('rep_calls')
        .select('started_at')
        .eq('rep_id', auth.userId)
        .order('started_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      const firstAt = firstCall?.started_at ? new Date(firstCall.started_at) : todayStart
      const weeksSince = Math.ceil((todayStart.getTime() - firstAt.getTime()) / (7 * 86400e3)) + 1
      const weeks = Math.min(26, Math.max(4, weeksSince))
      const rangeStart = new Date(todayStart)
      rangeStart.setUTCDate(rangeStart.getUTCDate() - (7 * weeks - 1))
      const points = Array.from({ length: weeks }, (_, i) => {
        const d = new Date(rangeStart.getTime() + i * 7 * 86400e3)
        return { key: d.toISOString().slice(0, 10), dials: 0, connects: 0, demos: 0 }
      })
      const idx = (iso: string) => Math.floor((new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime() - rangeStart.getTime()) / (7 * 86400e3))
      const { data: calls } = await supabaseAdmin
        .from('rep_calls')
        .select('status, started_at, duration_seconds')
        .eq('rep_id', auth.userId)
        .gte('started_at', rangeStart.toISOString())
      for (const c of (calls || []) as any[]) {
        const i = idx(c.started_at)
        if (i < 0 || i >= weeks) continue
        points[i].dials += 1
        if (c.status === 'completed' && (c.duration_seconds || 0) > 30) points[i].connects += 1
      }
      for (const r of demoRows) {
        const i = idx(r.last_touched_at)
        if (i >= 0 && i < weeks) points[i].demos += 1
      }
      // All-time headline counts every currently-scheduled demo, not
      // just ones inside the (capped) chart window.
      series = { range, points, demos_total: demoRows.length }
    } else {
      series = {
        range,
        points: daily.map((d) => ({ key: d.date, dials: d.dials, connects: d.connects, demos: d.demos })),
        demos_total: demosScheduledSince(weekStart),
      }
    }

    return NextResponse.json({
      success: true,
      calls: { today, week },
      leads: {
        ...counts,
        demos_booked_today: demosScheduledSince(todayStart),
        demos_booked_week: demosScheduledSince(weekStart),
      },
      daily,
      series,
      up_next: upNext,
      callbacks_due: callbacksDue,
      weekly_goal: weeklyGoal,
    })
  } catch (e) {
    logger.error('setter overview failed', { userId: auth.userId, error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
  }
}
