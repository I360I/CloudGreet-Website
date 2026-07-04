/**
 * Per-rep call-activity aggregation over `rep_calls`. Extracted from
 * app/api/admin/dialer/summary/route.ts so the same counting logic can
 * back both the admin oversight dashboard and a rep/setter's own
 * Overview stats, instead of drifting into two implementations.
 */
import { supabaseAdmin } from '@/lib/supabase'

export type RepCallStats = {
  attempts: number
  connects: number
  no_answers: number
  voicemails: number
  talk_seconds: number
  last_call_at: string | null
}

function emptyStats(): RepCallStats {
  return { attempts: 0, connects: 0, no_answers: 0, voicemails: 0, talk_seconds: 0, last_call_at: null }
}

/**
 * Aggregates one rep's `rep_calls` rows since `since` (default: start of
 * today, UTC) into attempts/connects/no_answers/voicemails/talk_seconds.
 * "Connect" matches the admin dashboard's definition: status=completed
 * AND duration > 30s (a pickup that immediately hangs up isn't a real
 * conversation).
 */
export async function getRepCallStats(repId: string, opts?: { since?: Date }): Promise<RepCallStats> {
  const since = opts?.since ?? (() => {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  })()

  const { data: calls } = await supabaseAdmin
    .from('rep_calls')
    .select('status, started_at, duration_seconds')
    .eq('rep_id', repId)
    .gte('started_at', since.toISOString())

  const stats = emptyStats()
  for (const c of (calls || []) as any[]) {
    stats.attempts += 1
    if (c.status === 'completed' && (c.duration_seconds || 0) > 30) stats.connects += 1
    if (c.status === 'no_answer') stats.no_answers += 1
    if (c.status === 'voicemail') stats.voicemails += 1
    stats.talk_seconds += c.duration_seconds || 0
    if (!stats.last_call_at || c.started_at > stats.last_call_at) stats.last_call_at = c.started_at
  }
  return stats
}

export type DailyCallCount = { date: string; dials: number; connects: number }

/**
 * Day-by-day dial/connect counts for the last `days` days (oldest first,
 * UTC calendar days, today included). Backs the setter Overview's bar
 * chart - a single query bucketed in memory rather than N queries, one
 * per day.
 */
export async function getRepDailySeries(repId: string, days = 7): Promise<DailyCallCount[]> {
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const rangeStart = new Date(todayStart)
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (days - 1))

  const buckets = new Map<string, DailyCallCount>()
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart)
    d.setUTCDate(d.getUTCDate() + i)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: key, dials: 0, connects: 0 })
  }

  const { data: calls } = await supabaseAdmin
    .from('rep_calls')
    .select('status, started_at, duration_seconds')
    .eq('rep_id', repId)
    .gte('started_at', rangeStart.toISOString())

  for (const c of (calls || []) as any[]) {
    const key = String(c.started_at).slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue // outside the window (clock skew edge case) - drop rather than crash
    bucket.dials += 1
    if (c.status === 'completed' && (c.duration_seconds || 0) > 30) bucket.connects += 1
  }

  return Array.from(buckets.values())
}
