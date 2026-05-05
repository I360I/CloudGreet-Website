import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { fetchUpcomingCalBookings } from '@/lib/sales/cal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/overview
 *
 * Aggregates everything the rep's home dashboard needs in a single
 * round-trip:
 *   · me           - name + payouts_enabled
 *   · todays       - leads with follow_up_at within today
 *   · overdue      - leads with follow_up_at < today (missed)
 *   · interested   - status='interested'/'demo_scheduled'/'proposal_sent'
 *   · stale        - claimed >14d ago, never touched, status='new'
 *   · pipeline     - counts by status
 *   · deals        - closes in pending / invoice_sent
 *   · earnings     - totals card data (mtd / owed / mrr / lifetime)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86_400_000)

    const fourteenAgo = new Date(now.getTime() - 14 * 86_400_000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      meRes,
      repProfileRes,
      todaysRes,
      overdueRes,
      interestedRes,
      staleRes,
      pipelineRes,
      dealsRes,
      ledgerRes,
      activeClosesRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('custom_users')
        .select('id, email, first_name, last_name, name')
        .eq('id', auth.userId)
        .maybeSingle(),
      supabaseAdmin
        .from('sales_reps')
        .select('stripe_connect_payouts_enabled, cal_api_key')
        .eq('id', auth.userId)
        .maybeSingle(),
      supabaseAdmin
        .from('lead_assignments')
        .select('lead_id, follow_up_at, status, leads:lead_id(business_name, contact_name, phone, email)')
        .eq('rep_id', auth.userId)
        .gte('follow_up_at', todayStart.toISOString())
        .lt('follow_up_at', todayEnd.toISOString())
        .order('follow_up_at', { ascending: true })
        .limit(20),
      supabaseAdmin
        .from('lead_assignments')
        .select('lead_id, follow_up_at, status, leads:lead_id(business_name, contact_name, phone, email)')
        .eq('rep_id', auth.userId)
        .lt('follow_up_at', todayStart.toISOString())
        .not('follow_up_at', 'is', null)
        .order('follow_up_at', { ascending: true })
        .limit(20),
      supabaseAdmin
        .from('lead_assignments')
        .select('lead_id, status, last_touched_at, leads:lead_id(business_name, contact_name, phone, email)')
        .eq('rep_id', auth.userId)
        .in('status', ['interested', 'demo_scheduled', 'proposal_sent'])
        .order('last_touched_at', { ascending: false, nullsFirst: false })
        .limit(15),
      supabaseAdmin
        .from('lead_assignments')
        .select('lead_id, assigned_at, status, leads:lead_id(business_name, contact_name, phone)')
        .eq('rep_id', auth.userId)
        .eq('status', 'new')
        .lt('assigned_at', fourteenAgo.toISOString())
        .order('assigned_at', { ascending: true })
        .limit(15),
      supabaseAdmin
        .from('lead_assignments')
        .select('status')
        .eq('rep_id', auth.userId),
      supabaseAdmin
        .from('closes')
        .select('id, prospect_business_name, agreed_monthly_cents, agreed_setup_fee_cents, status, created_at, business_id')
        .eq('rep_id', auth.userId)
        .in('status', ['pending', 'invoice_sent'])
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('commission_ledger')
        .select('commission_cents, earned_at, payout_id')
        .eq('rep_id', auth.userId)
        .gte('earned_at', monthStart.toISOString())
        .limit(2000),
      supabaseAdmin
        .from('closes')
        .select('agreed_monthly_cents, status, business_id, businesses:business_id(account_status)')
        .eq('rep_id', auth.userId)
        .eq('status', 'paid')
        .limit(500),
    ])

    const me = meRes.data
    const repProfile = repProfileRes.data

    // Cal.com upcoming bookings - best-effort, returns empty if no
    // key set or the API call fails.
    const calBookings = repProfile?.cal_api_key
      ? await fetchUpcomingCalBookings(repProfile.cal_api_key, { take: 10 })
      : []

    const pipeline: Record<string, number> = {}
    for (const r of pipelineRes.data || []) {
      const s = r.status || 'new'
      pipeline[s] = (pipeline[s] || 0) + 1
    }

    const monthCommission = (ledgerRes.data || []).reduce((s, r: any) => s + (r.commission_cents || 0), 0)
    const owed = (ledgerRes.data || [])
      .filter((r: any) => !r.payout_id)
      .reduce((s, r: any) => s + (r.commission_cents || 0), 0)

    // MRR counts only closes that have actually been paid (the
    // webhook flips close.status to 'paid' on first invoice payment).
    // Pre-payment "invoice_sent" closes are tracked in the customer
    // list as "awaiting first payment" but don't count toward MRR.
    const mrr = (activeClosesRes.data || []).reduce((s: number, c: any) => {
      const status = c.businesses?.account_status
      if (status && !['active', 'trial', null, undefined].includes(status)) return s
      return s + (c.agreed_monthly_cents || 0)
    }, 0)

    const cleanLeads = (rows: any[] | null) => (rows || []).map((r) => ({
      lead_id: r.lead_id,
      business_name: r.leads?.business_name || 'Unknown',
      contact_name: r.leads?.contact_name || null,
      phone: r.leads?.phone || null,
      email: r.leads?.email || null,
      follow_up_at: r.follow_up_at || null,
      status: r.status || 'new',
      assigned_at: r.assigned_at || null,
      last_touched_at: r.last_touched_at || null,
    }))

    return NextResponse.json({
      success: true,
      me: {
        name: me?.name || [me?.first_name, me?.last_name].filter(Boolean).join(' ') || me?.email || 'Rep',
        payouts_enabled: !!repProfile?.stripe_connect_payouts_enabled,
        cal_connected: !!repProfile?.cal_api_key,
      },
      todays: cleanLeads(todaysRes.data),
      overdue: cleanLeads(overdueRes.data),
      interested: cleanLeads(interestedRes.data),
      stale: cleanLeads(staleRes.data),
      pipeline,
      deals: dealsRes.data || [],
      earnings: {
        mtd_commission_cents: monthCommission,
        owed_cents: owed,
        mrr_cents: mrr,
      },
      cal_bookings: calBookings,
    })
  } catch (e) {
    logger.error('Sales overview load failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
  }
}
