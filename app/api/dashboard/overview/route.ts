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
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const businessId = auth.businessId

  const { data: business } = await supabaseAdmin
   .from('businesses')
   .select('id, business_name')
   .eq('id', businessId)
   .maybeSingle()

  // 30-day window for charts
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)

  // All calls in the last 30 days for this business
  const { data: calls30d } = await supabaseAdmin
   .from('calls')
   .select('id, retell_call_id, from_number, to_number, status, duration, transcript, recording_url, sentiment, call_summary, outcome, caller_name, created_at')
   .eq('business_id', businessId)
   .gte('created_at', thirtyDaysAgo)
   .order('created_at', { ascending: false })

  const allCalls = calls30d || []
  const totalCalls = allCalls.length
  const callsToday = allCalls.filter((c) => new Date(c.created_at) >= startOfToday).length
  const totalDuration = allCalls.reduce((sum, c) => sum + (c.duration || 0), 0)
  const avgDurationSec = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0

  // Outcome counts (best-effort: use outcome column or infer from status)
  let booked = 0, message = 0, dropped = 0
  for (const c of allCalls) {
   const o = (c.outcome || '').toLowerCase()
   if (o.includes('book') || o.includes('appoint')) booked++
   else if (o.includes('message') || o.includes('voicemail')) message++
   else if (c.status === 'failed' || (c.duration ?? 0) < 5) dropped++
   else message++
  }
  const bookedRate = totalCalls > 0 ? Math.round((booked / totalCalls) * 100) : 0

  // Daily volume for the last 30 days
  const dailyMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
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
  const now = new Date().toISOString()
  const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: appts } = await supabaseAdmin
   .from('appointments')
   .select('id, customer_name, customer_phone, service_type, scheduled_date, start_time, status, notes')
   .eq('business_id', businessId)
   .gte('scheduled_date', now)
   .lte('scheduled_date', twoWeeksOut)
   .order('scheduled_date', { ascending: true })
   .limit(20)

  return NextResponse.json({
   business: business || { id: businessId, business_name: 'Your Business' },
   kpis: { totalCalls, callsToday, avgDurationSec, bookedRate },
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
