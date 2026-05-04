import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/overview
 *
 * Returns everything the customer dashboard needs in one call,
 * scoped by businessId from the JWT (multi-tenant safe).
 *
 * {
 *   business: { id, name },
 *   kpis: { totalCalls, callsToday, avgDurationSec, bookedRate },
 *   recentCalls: [...],
 *   upcomingAppointments: [...],
 *   dailyVolume: [{ date, count }],
 *   outcomes: { booked, message, dropped }
 * }
 */
export async function GET(request: NextRequest) {
 try {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
   return NextResponse.json({
    error: !auth.success
     ? `Auth failed: ${auth.error || 'unknown'}`
     : 'Auth succeeded but no businessId in token — try signing out and back in',
   }, { status: 401 })
  }
  const businessId = auth.businessId
  const url = new URL(request.url)
  const range = Math.max(1, Math.min(180, parseInt(url.searchParams.get('range') || '30')))

  const { data: business } = await supabaseAdmin
   .from('businesses')
   .select('id, business_name')
   .eq('id', businessId)
   .maybeSingle()

  // Pull the live Retell number provisioned for this business (if any) so
  // the dashboard top bar shows the real number to call instead of the
  // hardcoded demo number that used to leak across tenants.
  const { data: retellPhoneRow } = await supabaseAdmin
   .from('phone_numbers')
   .select('phone_number, status')
   .eq('business_id', businessId)
   .eq('provider', 'retell')
   .order('created_at', { ascending: false })
   .limit(1)
   .maybeSingle()
  const retellPhone: string | null = retellPhoneRow?.phone_number || null

  // Two windows: current period (range days) and previous period (range days before that) for delta calcs
  const now = Date.now()
  const startCurrent = new Date(now - range * 24 * 60 * 60 * 1000).toISOString()
  const startPrevious = new Date(now - range * 2 * 24 * 60 * 60 * 1000).toISOString()
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  // Pull 2x range so we can compute deltas without a second round-trip
  const { data: callsAll } = await supabaseAdmin
   .from('calls')
   .select('id, retell_call_id, from_number, to_number, status, duration, transcript, recording_url, sentiment, call_summary, outcome, caller_name, created_at, call_extractions')
   .eq('business_id', businessId)
   .gte('created_at', startPrevious)
   .order('created_at', { ascending: false })

  const allCallsBoth = callsAll || []
  const allCalls = allCallsBoth.filter((c) => new Date(c.created_at).toISOString() >= startCurrent)
  const prevCalls = allCallsBoth.filter((c) => new Date(c.created_at).toISOString() < startCurrent)

  const totalCalls = allCalls.length
  const callsToday = allCalls.filter((c) => new Date(c.created_at) >= startOfToday).length
  const callsYesterday = allCalls.filter((c) => {
   const d = new Date(c.created_at)
   return d >= startOfYesterday && d < startOfToday
  }).length
  const totalDuration = allCalls.reduce((sum, c) => sum + (c.duration || 0), 0)
  const avgDurationSec = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
  const prevAvgDur = prevCalls.length > 0 ? Math.round(prevCalls.reduce((s, c) => s + (c.duration || 0), 0) / prevCalls.length) : 0

  const tagOutcome = (c: any): 'booked' | 'message' | 'dropped' => {
   const o = (c.outcome || '').toLowerCase()
   if (o.includes('book') || o.includes('appoint')) return 'booked'
   if (o.includes('message') || o.includes('voicemail')) return 'message'
   if (c.status === 'failed' || (c.duration ?? 0) < 5) return 'dropped'
   return 'message'
  }

  let booked = 0, message = 0, dropped = 0
  for (const c of allCalls) {
   const t = tagOutcome(c)
   if (t === 'booked') booked++
   else if (t === 'message') message++
   else dropped++
  }
  let prevBooked = 0
  for (const c of prevCalls) if (tagOutcome(c) === 'booked') prevBooked++
  const bookedRate = totalCalls > 0 ? Math.round((booked / totalCalls) * 100) : 0
  const prevBookedRate = prevCalls.length > 0 ? Math.round((prevBooked / prevCalls.length) * 100) : 0

  // Daily volume for the current period
  const dailyMap = new Map<string, number>()
  for (let i = range - 1; i >= 0; i--) {
   const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
   dailyMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const c of allCalls) {
   const day = new Date(c.created_at).toISOString().slice(0, 10)
   if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  }
  const dailyVolume = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))

  // Most recent 20 calls (for the calls list panel)
  const recentCalls = allCalls.slice(0, 20).map((c) => ({
   id: c.id,
   call_id: c.retell_call_id || c.id,
   from_number: c.from_number,
   caller_name: c.caller_name,
   duration: c.duration,
   created_at: c.created_at,
   status: c.status,
   sentiment: c.sentiment,
   summary: c.call_summary,
   transcript: c.transcript,
   recording_url: c.recording_url,
   outcome: c.outcome,
  }))

  // Upcoming appointments (next 14 days)
  const nowIso = new Date(now).toISOString()
  const twoWeeksOut = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: appts } = await supabaseAdmin
   .from('appointments')
   .select('id, customer_name, customer_phone, service_type, scheduled_date, start_time, status, notes')
   .eq('business_id', businessId)
   .gte('scheduled_date', nowIso)
   .lte('scheduled_date', twoWeeksOut)
   .order('scheduled_date', { ascending: true })
   .limit(20)

  // Sparkline data for KPI cards (last 14 days regardless of range)
  const sparkDays = Math.min(14, range)
  const spark = dailyVolume.slice(-sparkDays).map((d) => d.count)

  return NextResponse.json({
   business: business || { id: businessId, business_name: 'Your Business' },
   retellPhone,
   range,
   kpis: {
    totalCalls,
    callsToday,
    avgDurationSec,
    bookedRate,
    deltas: {
     totalCalls: prevCalls.length,
     callsYesterday,
     avgDurationSec: prevAvgDur,
     bookedRate: prevBookedRate,
    },
    spark,
   },
   outcomes: { booked, message, dropped },
   dailyVolume,
   recentCalls,
   upcomingAppointments: appts || [],
  })
 } catch (error) {
  logger.error('Dashboard overview error', {
   error: error instanceof Error ? error.message : 'Unknown',
  })
  return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
 }
}
