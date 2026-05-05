import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { getStripeClient } from '@/lib/billing/stripe-client'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/connect-onboarding
 *
 * Returns a Stripe Connect Express onboarding URL for the signed-in
 * rep. Creates the connected account on first call (Express type,
 * US, capabilities for transfers); subsequent calls reuse the same
 * account id and just regenerate a fresh AccountLink (those expire
 * in ~5 minutes, so we always generate a new one on click).
 *
 * The rep clicks the URL, fills out KYC + bank on Stripe-hosted
 * pages, and is redirected back to /sales/onboarding/done. We mark
 * payouts_enabled as true once Stripe webhook confirms - until then,
 * commissions still accrue but Friday auto-payout skips them.
 */
export async function POST(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const { data: user } = await supabaseAdmin
  .from('custom_users')
  .select('id, email, role')
  .eq('id', auth.userId)
  .maybeSingle()
 if (!user || user.role !== 'sales') {
  return NextResponse.json({ error: 'Sales role required' }, { status: 403 })
 }

 const { data: rep } = await supabaseAdmin
  .from('sales_reps')
  .select('*')
  .eq('id', user.id)
  .maybeSingle()
 if (!rep) {
  return NextResponse.json({ error: 'Sales profile not found' }, { status: 404 })
 }

 const stripe = getStripeClient()
 let accountId = rep.stripe_connect_account_id

 try {
  if (!accountId) {
   // Recovery path: if a previous attempt created the Stripe account
   // but our DB write failed, the account is "orphaned" - Stripe has
   // it but we don't know about it. Look for one tagged with this
   // user's id in metadata before creating a fresh one to avoid
   // accumulating duplicates.
   try {
    const list = await stripe.accounts.list({ limit: 100 })
    const orphan = list.data.find((a) => a.metadata?.cloudgreet_user_id === user.id)
    if (orphan) accountId = orphan.id
   } catch {
    // List can fail on very large platforms - fall back to creating fresh.
   }

   if (!accountId) {
    const account = await stripe.accounts.create({
     type: 'express',
     country: 'US',
     email: user.email,
     capabilities: { transfers: { requested: true } },
     business_type: 'individual',
     metadata: {
      cloudgreet_user_id: user.id,
      role: 'sales',
     },
    })
    accountId = account.id
   }
   const { error: persistErr } = await supabaseAdmin
    .from('sales_reps')
    .update({ stripe_connect_account_id: accountId, updated_at: new Date().toISOString() })
    .eq('id', user.id)
   if (persistErr) {
    logger.error('Failed to persist Stripe account id (orphan possible)', {
     userId: user.id, accountId, error: persistErr.message,
    })
   }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const link = await stripe.accountLinks.create({
   account: accountId,
   refresh_url: `${baseUrl}/sales/onboarding/refresh`,
   return_url: `${baseUrl}/sales/onboarding/done`,
   type: 'account_onboarding',
  })

  return NextResponse.json({ success: true, url: link.url, accountId })
 } catch (e) {
  logger.error('Stripe Connect onboarding failed', {
   userId: user.id, error: e instanceof Error ? e.message : 'Unknown',
  })
  return NextResponse.json(
   { error: e instanceof Error ? e.message : 'Stripe error' },
   { status: 502 },
  )
 }
}

/**
 * GET - refresh the rep's payouts_enabled flag from Stripe.
 * Useful after they finish the onboarding flow without webhooks.
 */
export async function GET(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const { data: rep } = await supabaseAdmin
  .from('sales_reps')
  .select('stripe_connect_account_id')
  .eq('id', auth.userId)
  .maybeSingle()
 if (!rep?.stripe_connect_account_id) {
  return NextResponse.json({ ok: false, reason: 'no_account' })
 }
 const stripe = getStripeClient()
 const account = await stripe.accounts.retrieve(rep.stripe_connect_account_id)
 await supabaseAdmin
  .from('sales_reps')
  .update({
   stripe_connect_payouts_enabled: !!account.payouts_enabled,
   stripe_connect_charges_enabled: !!account.charges_enabled,
   stripe_connect_details_submitted: !!account.details_submitted,
   updated_at: new Date().toISOString(),
  })
  .eq('id', auth.userId)
 return NextResponse.json({
  ok: true,
  payouts_enabled: !!account.payouts_enabled,
  details_submitted: !!account.details_submitted,
 })
}
