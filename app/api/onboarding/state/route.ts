import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Returns onboarding state + everything the wizard needs to render the
 * current step (services, phone number, calcom + forwarding status).
 */
export async function GET(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({
    success: false,
    error: !authResult.success
     ? `Auth failed: ${authResult.error || 'unknown'}`
     : 'No businessId in token',
   }, { status: 401 })
  }

  // Pull * so missing migration columns (calcom_connected, etc) don't
  // make the entire query fail. We derive calcom_connected from
  // cal_com_api_key presence below for the same reason.
  const { data: business, error } = await supabaseAdmin
   .from('businesses')
   .select('*')
   .eq('id', authResult.businessId)
   .single()

  if (error || !business) {
   return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
  }

  // Self-heal: if Cal.com API key is on file but no booking webhook is
  // registered, fire the registration in the background. Same fix as
  // the admin auto-rewire; runs on every client dashboard load so the
  // contractor never has to do anything.
  if ((business as any).cal_com_api_key && !(business as any).cal_com_webhook_id) {
   void import('@/lib/calcom-auto-webhook').then(({ ensureCalcomWebhookForBusiness }) =>
    ensureCalcomWebhookForBusiness(authResult.businessId!)
   ).catch(() => {})
  }

  // Backfill: any business that already passed the test-call check should
  // be onboarding_completed regardless of pay status. Older verify flow
  // gated this on Stripe; this self-heals businesses that got stuck on
  // "Demo data shown" after verifying but before paying.
  let onboardingCompleted = (business as any).onboarding_completed
  if (!onboardingCompleted && (business as any).forwarding_verified_at) {
   onboardingCompleted = true
   await supabaseAdmin
    .from('businesses')
    .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq('id', authResult.businessId)
  }

  // Derive: if there's an API key on file, the integration is connected.
  // The dedicated column may be missing in older deployments.
  const calcomConnected = !!(business as any).cal_com_api_key

  return NextResponse.json({
   success: true,
   business: { ...business, onboarding_completed: onboardingCompleted, calcom_connected: calcomConnected },
  })
 } catch (e) {
  logger.error('Onboarding state error', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500 })
 }
}

/**
 * Persists the wizard's step + finalizes onboarding.
 */
export async function PATCH(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const allowed: Record<string, any> = {}
  if (typeof body.onboarding_step === 'string') allowed.onboarding_step = body.onboarding_step
  if (typeof body.onboarding_completed === 'boolean') allowed.onboarding_completed = body.onboarding_completed

  if (Object.keys(allowed).length === 0) {
   return NextResponse.json({ success: false, error: 'No valid fields' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
   .from('businesses')
   .update({ ...allowed, updated_at: new Date().toISOString() })
   .eq('id', authResult.businessId)

  if (error) {
   return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
 } catch (e) {
  return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
 }
}
