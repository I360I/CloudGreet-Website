import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { geolocate, jitter } from '@/lib/geo/us-geo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/overview
 *
 * Single roundtrip for the admin home: cross-tenant KPIs +
 * per-client aggregates (calls this month, last activity,
 * 14-day sparkline) so the table can render rich rows without
 * N+1 fetching.
 */
export async function GET(request: NextRequest) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1) Pull every business
  const { data: businesses, error: bizError } = await supabaseAdmin
   .from('businesses')
   .select(`
    id, business_name, email, phone_number, business_type,
    subscription_status, account_status, onboarding_completed,
    calcom_connected, forwarding_verified_at, created_at,
    monthly_price_cents, city, state
   `)
   .order('created_at', { ascending: false })

  if (bizError) {
   logger.error('Admin overview: businesses query failed', { error: bizError.message })
   return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }

  const allBusinesses = businesses || []
  const ids = allBusinesses.map((b) => b.id)

  // 2) Pull every call from the last 31 days for these businesses (one query).
  // 31 (not 30) so "this month" is always fully covered, even on the 31st.
  const thirtyDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentCalls } = ids.length
   ? await supabaseAdmin
    .from('calls')
    .select('id, business_id, created_at, status')
    .in('business_id', ids)
    .gte('created_at', thirtyDaysAgo)
   : { data: [] as any[] }

  const calls = recentCalls || []

  // 2b) Bookings (appointments) over the same window, excluding cancelled
  const { data: recentAppts } = ids.length
   ? await supabaseAdmin
    .from('appointments')
    .select('id, business_id, created_at, status')
    .in('business_id', ids)
    .gte('created_at', thirtyDaysAgo)
    .not('status', 'in', '(cancelled)')
   : { data: [] as any[] }

  const bookings = recentAppts || []

  // 3) Compute per-client aggregates
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfTodayIso = startOfToday.toISOString()

  // Bucketing helpers
  const localDateKey = (d: Date) =>
   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // 14-day sparkline buckets (oldest → newest)
  const sparkBuckets: string[] = []
  for (let i = 13; i >= 0; i--) {
   const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
   sparkBuckets.push(localDateKey(d))
  }

  type Aggregate = {
   callsThisMonth: number
   callsToday: number
   spark: number[]
   lastCallAt: string | null
  }

  const aggregateByBiz = new Map<string, Aggregate>()
  for (const id of ids) {
   aggregateByBiz.set(id, {
    callsThisMonth: 0,
    callsToday: 0,
    spark: new Array(14).fill(0),
    lastCallAt: null,
   })
  }

  for (const c of calls) {
   const a = aggregateByBiz.get(c.business_id)
   if (!a) continue
   const created = new Date(c.created_at)
   const iso = c.created_at
   if (iso >= startOfMonth) a.callsThisMonth++
   if (iso >= startOfTodayIso) a.callsToday++
   const key = localDateKey(created)
   const idx = sparkBuckets.indexOf(key)
   if (idx >= 0) a.spark[idx]++
   if (!a.lastCallAt || iso > a.lastCallAt) a.lastCallAt = iso
  }

  // 4) Cross-tenant KPIs
  const totalClients = allBusinesses.length
  const activeClients = allBusinesses.filter((b) => b.subscription_status === 'active').length
  const trialingClients = allBusinesses.filter((b) => b.subscription_status === 'trialing').length
  const inOnboarding = allBusinesses.filter((b) => !b.onboarding_completed).length
  const callsToday = calls.filter((c) => c.created_at >= startOfTodayIso).length
  const callsThisMonth = calls.filter((c) => c.created_at >= startOfMonth).length

  // Cross-tenant 14-day sparkline (sum across all clients)
  const overallSpark = new Array(14).fill(0)
  for (const c of calls) {
   const key = localDateKey(new Date(c.created_at))
   const idx = sparkBuckets.indexOf(key)
   if (idx >= 0) overallSpark[idx]++
  }

  // 4b) 30-day daily series (calls + bookings) for the dashboard charts
  const seriesDays: string[] = []
  for (let i = 29; i >= 0; i--) {
   const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
   seriesDays.push(localDateKey(d))
  }
  const seriesIdx = new Map(seriesDays.map((k, i) => [k, i]))
  const callsSeries = new Array(30).fill(0)
  const bookingsSeries = new Array(30).fill(0)
  for (const c of calls) {
   const idx = seriesIdx.get(localDateKey(new Date(c.created_at)))
   if (idx !== undefined) callsSeries[idx]++
  }
  let bookingsThisMonth = 0
  let bookingsToday = 0
  for (const b of bookings) {
   const idx = seriesIdx.get(localDateKey(new Date(b.created_at)))
   if (idx !== undefined) bookingsSeries[idx]++
   if (b.created_at >= startOfMonth) bookingsThisMonth++
   if (b.created_at >= startOfTodayIso) bookingsToday++
  }

  // 4c) Finance: MRR from negotiated prices vs measured cost-to-serve (MTD)
  const KNOWN_PROVIDERS = ['retell', 'anthropic', 'telnyx', 'stripe', 'google'] as const
  const mrrCents = allBusinesses.reduce((sum, b: any) =>
   b.subscription_status === 'active' ? sum + ((b.monthly_price_cents as number) || 0) : sum, 0)
  const payingClients = allBusinesses.filter((b: any) =>
   b.subscription_status === 'active' && ((b.monthly_price_cents as number) || 0) > 0).length

  const costByProvider: Record<string, number> = {
   retell: 0, anthropic: 0, telnyx: 0, stripe: 0, google: 0, other: 0,
  }
  let costMtdCents = 0
  const { data: costRows } = await supabaseAdmin
   .from('usage_costs')
   .select('provider, amount_cents')
   .gte('occurred_at', startOfMonth)
  for (const r of costRows || []) {
   const cents = (r.amount_cents as number) || 0
   const provider = (r.provider as string) || 'other'
   costMtdCents += cents
   if ((KNOWN_PROVIDERS as readonly string[]).includes(provider)) costByProvider[provider] += cents
   else costByProvider.other += cents
  }
  const marginCents = mrrCents - costMtdCents
  const marginPct = mrrCents > 0 ? Math.round((marginCents / mrrCents) * 1000) / 10 : null

  // 4d) Map points: clients (green) + demo leads (yellow). Located from
  // city/state when filled in, else the phone's area code (metro-level).
  type MapPoint = { id: string; name: string; lat: number; lng: number; kind: 'client' | 'demo' }
  const mapPoints: MapPoint[] = []
  for (const b of allBusinesses as any[]) {
   const loc = geolocate({ city: b.city, state: b.state, phone: b.phone_number })
   if (!loc) continue
   const [lat, lng] = jitter(loc[0], loc[1], String(b.id))
   mapPoints.push({ id: b.id, name: b.business_name || 'Client', lat, lng, kind: 'client' })
  }
  const { data: demoLeads } = await supabaseAdmin
   .from('demo_leads')
   .select('id, name, phone, created_at')
   .order('created_at', { ascending: false })
   .limit(300)
  for (const d of demoLeads || []) {
   const loc = geolocate({ phone: (d as any).phone })
   if (!loc) continue
   const [lat, lng] = jitter(loc[0], loc[1], String((d as any).id))
   mapPoints.push({ id: (d as any).id, name: (d as any).name || 'Demo lead', lat, lng, kind: 'demo' })
  }

  // 5) Stitch it together
  const enrichedClients = allBusinesses.map((b) => {
   const a = aggregateByBiz.get(b.id) || {
    callsThisMonth: 0, callsToday: 0, spark: new Array(14).fill(0), lastCallAt: null,
   }
   return {
    id: b.id,
    business_name: b.business_name,
    email: b.email,
    phone_number: b.phone_number,
    business_type: b.business_type,
    subscription_status: b.subscription_status,
    account_status: b.account_status,
    onboarding_completed: b.onboarding_completed,
    calcom_connected: b.calcom_connected,
    forwarding_verified_at: b.forwarding_verified_at,
    created_at: b.created_at,
    calls_this_month: a.callsThisMonth,
    calls_today: a.callsToday,
    spark: a.spark,
    last_call_at: a.lastCallAt,
   }
  })

  return NextResponse.json({
   success: true,
   kpis: {
    totalClients,
    activeClients,
    trialingClients,
    inOnboarding,
    callsToday,
    callsThisMonth,
    bookingsToday,
    bookingsThisMonth,
    overallSpark,
   },
   finance: {
    mrrCents,
    payingClients,
    costMtdCents,
    costByProvider,
    marginCents,
    marginPct,
   },
   series: {
    days: seriesDays,
    calls: callsSeries,
    bookings: bookingsSeries,
   },
   map: { points: mapPoints },
   clients: enrichedClients,
  })
 } catch (e) {
  logger.error('Admin overview failed', {
   error: e instanceof Error ? e.message : 'Unknown',
  })
  return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
 }
}
