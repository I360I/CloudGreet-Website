import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/system-health
 *
 * One-shot operator dashboard. Aggregates real signal across:
 *   - Configuration (env vars, Telnyx balance)
 *   - Active pipeline (queued demos, stuck agents, abandoned onboardings)
 *   - Money (active subs, dunning, rep stripe-connect status)
 *   - Trouble (last-24h failures + bad-call signal)
 *   - Coming up (demos in next 24h, recent paid closes)
 *
 * Strict rule: no fake values. If a section's table doesn't exist or
 * a query throws, that section returns { available: false, reason }
 * instead of zeroes. Frontend renders that as a clear "not tracked"
 * pill so the operator can tell real-zero from data-missing.
 *
 * Each section runs in its own try/catch so one bad query doesn't
 * blow the whole page. Runs queries in parallel where possible.
 */

type Section<T> = { available: true; data: T } | { available: false; reason: string }

async function safe<T>(fn: () => Promise<T>): Promise<Section<T>> {
  try {
    const data = await fn()
    return { available: true, data }
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'unknown' }
  }
}

async function fetchTelnyxBalance(): Promise<{ balance_dollars: number; currency: string } | null> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return null
  const r = await fetch('https://api.telnyx.com/v2/balance', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!r.ok) throw new Error(`telnyx /balance returned ${r.status}`)
  const j = await r.json()
  // Telnyx returns balance as a string in dollars under data.balance.
  const cents = Number(j?.data?.balance || 0)
  return {
    balance_dollars: Number(cents),
    currency: j?.data?.currency || 'USD',
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const next24hIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  // -------- run everything in parallel --------
  const [
    closesByStatus,
    closesPendingAgent,
    closesStuckAfterPaid,
    onboardingsAbandoned,
    activeBusinesses,
    upcomingDemos,
    recentPaidCloses,
    callsLast24h,
    failedReviewLast24h,
    recentDunning,
    repsWithStuckStripe,
    telnyxBalance,
    cronAlive,
  ] = await Promise.all([
    safe(async () => {
      const { data, error } = await supabaseAdmin
        .from('closes').select('status', { count: 'exact' })
      if (error) throw new Error(error.message)
      const counts: Record<string, number> = {}
      for (const r of (data || []) as any[]) counts[r.status] = (counts[r.status] || 0) + 1
      return counts
    }),
    safe(async () => {
      const { count, error } = await supabaseAdmin
        .from('closes')
        .select('id', { count: 'exact', head: true })
        .is('business_id', null)
        .neq('status', 'rejected')
        .neq('status', 'cancelled')
      if (error) throw new Error(error.message)
      return count || 0
    }),
    safe(async () => {
      // Paid >24h ago but the business still has no Retell agent / phone.
      const { data, error } = await supabaseAdmin
        .from('closes')
        .select('id, business_id, prospect_business_name, updated_at, businesses!inner(retell_agent_id, phone_number)')
        .eq('status', 'paid')
        .lt('updated_at', dayAgoIso)
      if (error) throw new Error(error.message)
      return (data || []).filter((c: any) =>
        !c.businesses?.retell_agent_id || !c.businesses?.phone_number
      ).map((c: any) => ({
        close_id: c.id,
        business_id: c.business_id,
        business_name: c.prospect_business_name,
        updated_at: c.updated_at,
        missing: [
          !c.businesses?.retell_agent_id ? 'agent' : null,
          !c.businesses?.phone_number ? 'phone' : null,
        ].filter(Boolean),
      }))
    }),
    safe(async () => {
      // Businesses where the owner paid but onboarding never completed >7d ago.
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('id, business_name, created_at, onboarding_completed, calcom_connected, forwarding_verified_at')
        .eq('onboarding_completed', false)
        .lt('created_at', weekAgoIso)
        .limit(20)
      if (error) throw new Error(error.message)
      return (data || []).map((b: any) => ({
        business_id: b.id,
        business_name: b.business_name,
        created_at: b.created_at,
        calcom_done: !!b.calcom_connected,
        forwarding_done: !!b.forwarding_verified_at,
      }))
    }),
    safe(async () => {
      const { count, error } = await supabaseAdmin
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('onboarding_completed', true)
      if (error) throw new Error(error.message)
      return count || 0
    }),
    safe(async () => {
      const { data, error } = await supabaseAdmin
        .from('closes')
        .select('id, prospect_business_name, demo_scheduled_at, rep_id, demo_agent_status')
        .gte('demo_scheduled_at', nowIso)
        .lt('demo_scheduled_at', next24hIso)
        .order('demo_scheduled_at', { ascending: true })
        .limit(10)
      if (error) throw new Error(error.message)
      const repIds = Array.from(new Set((data || []).map((d: any) => d.rep_id).filter(Boolean)))
      const repNames: Record<string, string> = {}
      if (repIds.length > 0) {
        const { data: reps } = await supabaseAdmin
          .from('custom_users')
          .select('id, name, first_name, last_name, email')
          .in('id', repIds)
        for (const r of reps || []) {
          const u = r as any
          repNames[u.id] = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email
        }
      }
      return (data || []).map((d: any) => ({
        close_id: d.id,
        business_name: d.prospect_business_name,
        scheduled_at: d.demo_scheduled_at,
        rep_name: repNames[d.rep_id] || null,
        agent_status: d.demo_agent_status,
      }))
    }),
    safe(async () => {
      const { data, error } = await supabaseAdmin
        .from('closes')
        .select('id, prospect_business_name, agreed_monthly_cents, updated_at')
        .eq('status', 'paid')
        .order('updated_at', { ascending: false })
        .limit(5)
      if (error) throw new Error(error.message)
      return (data || []).map((c: any) => ({
        close_id: c.id,
        business_name: c.prospect_business_name,
        monthly_cents: c.agreed_monthly_cents,
        paid_at: c.updated_at,
      }))
    }),
    safe(async () => {
      // Calls in last 24h - count + average duration + how many were
      // very short (likely agent failure proxy).
      const { data, error } = await supabaseAdmin
        .from('calls')
        .select('id, duration_seconds, started_at')
        .gte('started_at', dayAgoIso)
      if (error) throw new Error(error.message)
      const rows = (data || []) as any[]
      const total = rows.length
      const durations = rows
        .map((r) => Number(r.duration_seconds))
        .filter((n) => Number.isFinite(n) && n > 0)
      const avg = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0
      const veryShort = durations.filter((n) => n < 30).length
      return {
        total,
        avg_duration_secs: avg,
        very_short_count: veryShort,
        very_short_pct: total > 0 ? Math.round((veryShort / total) * 100) : 0,
      }
    }),
    safe(async () => {
      const { data, error } = await supabaseAdmin
        .from('review_requests')
        .select('id, customer_phone, failure_reason, updated_at, business_id')
        .eq('status', 'failed')
        .gte('updated_at', dayAgoIso)
        .order('updated_at', { ascending: false })
        .limit(10)
      if (error) throw new Error(error.message)
      return (data || []).map((r: any) => ({
        id: r.id,
        phone: r.customer_phone,
        reason: r.failure_reason,
        when: r.updated_at,
      }))
    }),
    safe(async () => {
      // Recent failed Stripe payments - the dunning queue.
      const { data, error } = await supabaseAdmin
        .from('billing_dunning_events')
        .select('id, business_id, event_type, amount_cents, created_at')
        .gte('created_at', weekAgoIso)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw new Error(error.message)
      return (data || []).map((d: any) => ({
        id: d.id,
        business_id: d.business_id,
        event_type: d.event_type,
        amount_cents: d.amount_cents,
        created_at: d.created_at,
      }))
    }),
    safe(async () => {
      // Sales reps who created an account but haven't finished Stripe Connect.
      const { data, error } = await supabaseAdmin
        .from('custom_users')
        .select('id, name, first_name, last_name, email, stripe_payouts_enabled, status, created_at')
        .eq('role', 'sales')
        .eq('status', 'active')
        .or('stripe_payouts_enabled.is.null,stripe_payouts_enabled.eq.false')
      if (error) throw new Error(error.message)
      return (data || []).map((u: any) => ({
        id: u.id,
        name: u.name || [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
        email: u.email,
        created_at: u.created_at,
      }))
    }),
    safe(fetchTelnyxBalance),
    safe(async () => {
      // Crude but real: when did the latest review_requests row get
      // updated by the cron? If it's been >2 days since the most recent
      // queued/sent activity, something might be off with cron.
      const { data, error } = await supabaseAdmin
        .from('review_requests')
        .select('updated_at, status')
        .order('updated_at', { ascending: false })
        .limit(1)
      if (error) throw new Error(error.message)
      const latest = (data || [])[0] as any
      return {
        latest_activity_at: latest?.updated_at || null,
        latest_status: latest?.status || null,
      }
    }),
  ])

  return NextResponse.json({
    success: true,
    generated_at: new Date().toISOString(),
    config: {
      env: {
        // Money
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
        // Voice
        RETELL_API_KEY: !!process.env.RETELL_API_KEY,
        RETELL_WEBHOOK_SECRET: !!process.env.RETELL_WEBHOOK_SECRET,
        // SMS
        TELNYX_API_KEY: !!process.env.TELNYX_API_KEY,
        TELNYX_PUBLIC_KEY: !!process.env.TELNYX_PUBLIC_KEY,
        TELNYX_MESSAGING_PROFILE_ID: !!process.env.TELNYX_MESSAGING_PROFILE_ID,
        CLOUDGREET_NOTIFICATIONS_FROM: !!process.env.CLOUDGREET_NOTIFICATIONS_FROM,
        // Email
        RESEND_API_KEY: !!process.env.RESEND_API_KEY,
        RESEND_REPLY_TO: !!process.env.RESEND_REPLY_TO,
        SUPPORT_EMAIL: !!process.env.SUPPORT_EMAIL,
        FOUNDER_EMAIL: !!process.env.FOUNDER_EMAIL,
        // Calendar
        // (cal.com is per-business, not workspace-level)
        // LLMs (for agent-builder)
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        // Maps / scraping
        GOOGLE_PLACES_API_KEY: !!process.env.GOOGLE_PLACES_API_KEY,
        // Slack
        SLACK_WEBHOOK_URL: !!process.env.SLACK_WEBHOOK_URL,
        SLACK_BOT_TOKEN: !!process.env.SLACK_BOT_TOKEN,
        SLACK_INVITE_URL: !!process.env.SLACK_INVITE_URL,
        SLACK_AGENT_COMPLETE_MENTIONS: !!process.env.SLACK_AGENT_COMPLETE_MENTIONS,
        // Auth
        JWT_SECRET: !!process.env.JWT_SECRET,
        // Reviews / agent-builder runtime
        ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY, // optional
      },
      telnyx_balance: telnyxBalance,
    },
    pipeline: {
      closes_by_status: closesByStatus,
      closes_pending_agent: closesPendingAgent,
      closes_stuck_after_paid: closesStuckAfterPaid,
      onboardings_abandoned: onboardingsAbandoned,
      active_businesses: activeBusinesses,
    },
    schedule: {
      upcoming_demos: upcomingDemos,
    },
    money: {
      recent_dunning: recentDunning,
      reps_with_stuck_stripe: repsWithStuckStripe,
      recent_paid_closes: recentPaidCloses,
    },
    trouble: {
      calls_last_24h: callsLast24h,
      failed_review_last_24h: failedReviewLast24h,
      cron_alive: cronAlive,
    },
  })
}
