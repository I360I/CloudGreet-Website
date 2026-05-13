import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/dialer/summary
 *
 * Single endpoint feeding the /admin/dialer page. Returns:
 *  - live:   reps actively on a call right now (status=ringing|active AND
 *            started_at within the last 10 minutes, so orphan rows from
 *            crashed tabs don't pollute the live count)
 *  - today:  per-rep counters for the current UTC day - attempts, connects
 *            (completed AND duration > 30s), no-answers/voicemails, total
 *            talk seconds, last_call_at
 *  - recent: last 50 completed/no_answer/voicemail rows across all reps
 *
 * Query params:
 *  - rep_id (optional) - if set, scopes today/recent to one rep for drill-in
 */

const LIVE_WINDOW_MIN = 10
const TODAY_RECENT_LIMIT = 50

type RepRow = { id: string; email: string; first_name: string | null; last_name: string | null; name: string | null }
type CallRow = {
 id: string
 rep_id: string
 lead_id: string | null
 to_number: string
 from_number: string | null
 status: string
 started_at: string
 ended_at: string | null
 duration_seconds: number | null
 telnyx_call_id: string | null
}

function repName(r: RepRow | undefined): string {
 if (!r) return 'Unknown rep'
 const fl = [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
 return fl || r.name || r.email || 'Unknown rep'
}

export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 try {
  const sp = request.nextUrl.searchParams
  const repFilter = (sp.get('rep_id') || '').trim()

  const now = new Date()
  const liveSince = new Date(now.getTime() - LIVE_WINDOW_MIN * 60_000).toISOString()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()

  // All sales reps - we need names regardless of whether they made calls today.
  const { data: reps } = await supabaseAdmin
   .from('custom_users')
   .select('id, email, first_name, last_name, name')
   .eq('role', 'sales')
  const repMap = new Map<string, RepRow>((reps || []).map((r: any) => [r.id, r]))

  // Live calls - status in (ringing, active) AND started recently.
  let liveQuery = supabaseAdmin
   .from('rep_calls')
   .select('id, rep_id, lead_id, to_number, from_number, status, started_at, ended_at, duration_seconds, telnyx_call_id')
   .in('status', ['ringing', 'active'])
   .gte('started_at', liveSince)
   .order('started_at', { ascending: false })
  if (repFilter) liveQuery = liveQuery.eq('rep_id', repFilter)
  const { data: liveCalls } = await liveQuery

  // Today's calls (for per-rep aggregation).
  let todayQuery = supabaseAdmin
   .from('rep_calls')
   .select('id, rep_id, status, started_at, duration_seconds')
   .gte('started_at', todayStart)
  if (repFilter) todayQuery = todayQuery.eq('rep_id', repFilter)
  const { data: todayCalls } = await todayQuery

  // Aggregate by rep.
  type Agg = { rep_id: string; attempts: number; connects: number; no_answers: number; voicemails: number; talk_seconds: number; last_call_at: string | null }
  const aggMap = new Map<string, Agg>()
  for (const c of (todayCalls || []) as any[]) {
   const a = aggMap.get(c.rep_id) || { rep_id: c.rep_id, attempts: 0, connects: 0, no_answers: 0, voicemails: 0, talk_seconds: 0, last_call_at: null }
   a.attempts += 1
   if (c.status === 'completed' && (c.duration_seconds || 0) > 30) a.connects += 1
   if (c.status === 'no_answer') a.no_answers += 1
   if (c.status === 'voicemail') a.voicemails += 1
   a.talk_seconds += c.duration_seconds || 0
   if (!a.last_call_at || c.started_at > a.last_call_at) a.last_call_at = c.started_at
   aggMap.set(c.rep_id, a)
  }
  const today = Array.from(aggMap.values())
   .map((a) => ({ ...a, rep_name: repName(repMap.get(a.rep_id)) }))
   .sort((x, y) => y.attempts - x.attempts)

  // Recent feed.
  let recentQuery = supabaseAdmin
   .from('rep_calls')
   .select('id, rep_id, lead_id, to_number, status, started_at, ended_at, duration_seconds')
   .in('status', ['completed', 'no_answer', 'voicemail', 'busy', 'failed', 'rejected'])
   .order('started_at', { ascending: false })
   .limit(TODAY_RECENT_LIMIT)
  if (repFilter) recentQuery = recentQuery.eq('rep_id', repFilter)
  const { data: recentCalls } = await recentQuery

  // Hydrate lead/business names for live + recent calls.
  const leadIds = new Set<string>()
  for (const c of (liveCalls || []) as any[]) if (c.lead_id) leadIds.add(c.lead_id)
  for (const c of (recentCalls || []) as any[]) if (c.lead_id) leadIds.add(c.lead_id)
  let leadMap = new Map<string, string>()
  if (leadIds.size > 0) {
   const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, business_name')
    .in('id', Array.from(leadIds))
   leadMap = new Map((leads || []).map((l: any) => [l.id, l.business_name as string]))
  }

  const live = (liveCalls || []).map((c: any) => ({
   id: c.id,
   rep_id: c.rep_id,
   rep_name: repName(repMap.get(c.rep_id)),
   lead_id: c.lead_id,
   lead_name: c.lead_id ? leadMap.get(c.lead_id) || null : null,
   to_number: c.to_number,
   status: c.status,
   started_at: c.started_at,
   elapsed_seconds: Math.max(0, Math.floor((Date.now() - new Date(c.started_at).getTime()) / 1000)),
  }))

  const recent = (recentCalls || []).map((c: any) => ({
   id: c.id,
   rep_id: c.rep_id,
   rep_name: repName(repMap.get(c.rep_id)),
   lead_id: c.lead_id,
   lead_name: c.lead_id ? leadMap.get(c.lead_id) || null : null,
   to_number: c.to_number,
   status: c.status,
   started_at: c.started_at,
   ended_at: c.ended_at,
   duration_seconds: c.duration_seconds,
  }))

  return NextResponse.json({
   live,
   today,
   recent,
   reps: (reps || []).map((r: any) => ({ id: r.id, name: repName(r) })),
   generated_at: new Date().toISOString(),
  })
 } catch (e) {
  logger.error('admin dialer summary failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed' }, { status: 500 })
 }
}
