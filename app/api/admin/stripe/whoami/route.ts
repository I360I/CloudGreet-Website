import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getStripeClient } from '@/lib/billing/stripe-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/stripe/whoami
 *
 * Returns the Stripe account id and Connect-capability status for
 * whatever STRIPE_SECRET_KEY is in env. Lets the admin confirm the
 * key actually points at the account where they activated Connect
 * (the "sandbox account vs. test mode" gotcha is the most common
 * source of 'Connect not activated' errors).
 */
export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })

 const key = process.env.STRIPE_SECRET_KEY || ''
 if (!key) {
  return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 500 })
 }
 const mode = key.startsWith('sk_live_') ? 'live' : key.startsWith('sk_test_') ? 'test' : 'unknown'

 try {
  const stripe = getStripeClient()
  // Account.retrieve() with no id returns the *platform* account
  // (the one the API key belongs to). Different from getting a
  // connected account.
  const account = await stripe.accounts.retrieve()
  return NextResponse.json({
   success: true,
   key_mode: mode,
   key_prefix: key.slice(0, 8) + '…',
   account_id: account.id,
   business_profile_name: account.business_profile?.name ?? null,
   email: account.email ?? null,
   country: account.country ?? null,
   capabilities: account.capabilities ?? null,
   // 'transfers' capability needs to be active on the platform for
   // accountLinks/express onboarding to work.
   transfers_active: account.capabilities?.transfers === 'active',
   // The "Connect" feature flag itself isn't directly readable via
   // API, but if accounts.create with type=express works, Connect
   // is enabled. We'll know in one click.
  })
 } catch (e) {
  return NextResponse.json({
   success: false,
   key_mode: mode,
   error: e instanceof Error ? e.message : 'Unknown',
  }, { status: 500 })
 }
}
