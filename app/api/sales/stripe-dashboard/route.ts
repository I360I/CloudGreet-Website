import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { getStripeClient } from '@/lib/billing/stripe-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/stripe-dashboard
 *
 * Returns a single-use URL to the rep's Stripe Express dashboard.
 * That dashboard is where reps:
 *   · See all their transfers (Friday payouts) with full breakdowns
 *   · Download tax forms once Stripe issues them (1099-NEC for >$600 paid)
 *   · Update bank account / payout schedule
 *   · Update KYC info / SSN
 *
 * Login links expire after a short window and one click - generate
 * fresh on every request.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: rep } = await supabaseAdmin
    .from('sales_reps')
    .select('stripe_connect_account_id')
    .eq('id', auth.userId)
    .maybeSingle()

  if (!rep?.stripe_connect_account_id) {
    return NextResponse.json({
      error: 'You need to finish Stripe Connect onboarding first.',
    }, { status: 409 })
  }

  try {
    const stripe = getStripeClient()
    const link = await stripe.accounts.createLoginLink(rep.stripe_connect_account_id)
    return NextResponse.json({ success: true, url: link.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Stripe error'
    logger.error('Stripe login link failed', { userId: auth.userId, error: msg })
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
