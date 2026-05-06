import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { ONBOARDING_STEPS } from '@/lib/sales/onboarding-steps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/onboarding/progress
 *
 * Advances the rep one step. Body: { complete_step: number }.
 * - Only allows completing the rep's current step (no skipping ahead).
 * - Step 3 (Stripe Connect) is rejected unless stripe_connect_payouts_enabled.
 * - Step 7 (quiz) goes through /api/sales/onboarding/quiz instead.
 * - On step 1 transition, stamps onboarding_started_at.
 * - Reaching step 7 stays at step 7 until the quiz passes; the quiz
 *   endpoint sets onboarding_completed_at.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { complete_step?: number }
  const completeStep = Number(body.complete_step)
  if (!Number.isInteger(completeStep) || completeStep < 1 || completeStep > ONBOARDING_STEPS.length) {
    return NextResponse.json({ error: 'invalid complete_step' }, { status: 400 })
  }

  try {
    const { data: rep } = await supabaseAdmin
      .from('sales_reps')
      .select('current_onboarding_step, onboarding_started_at, stripe_connect_payouts_enabled')
      .eq('id', auth.userId)
      .maybeSingle()

    const current = (rep as any)?.current_onboarding_step ?? 1
    if (completeStep !== current) {
      return NextResponse.json({
        error: `Cannot skip - finish step ${current} first`,
      }, { status: 409 })
    }

    const stepDef = ONBOARDING_STEPS.find((s) => s.number === completeStep)
    if (!stepDef) return NextResponse.json({ error: 'unknown step' }, { status: 400 })

    if (stepDef.kind === 'stripe-connect' && !(rep as any)?.stripe_connect_payouts_enabled) {
      return NextResponse.json({
        error: 'Finish Stripe Connect before continuing - payouts must be enabled.',
      }, { status: 409 })
    }
    if (stepDef.kind === 'quiz') {
      return NextResponse.json({
        error: 'Submit the quiz via /api/sales/onboarding/quiz',
      }, { status: 409 })
    }

    const nextStep = Math.min(completeStep + 1, ONBOARDING_STEPS.length)
    const nowIso = new Date().toISOString()
    const update: Record<string, any> = {
      current_onboarding_step: nextStep,
      updated_at: nowIso,
    }
    if (!(rep as any)?.onboarding_started_at) {
      update.onboarding_started_at = nowIso
    }

    // Upsert so a missing sales_reps row doesn't silently no-op the
    // update (which would return success but never advance the rep).
    const { error: upErr } = await supabaseAdmin
      .from('sales_reps')
      .upsert({ id: auth.userId, ...update }, { onConflict: 'id' })
    if (upErr) {
      return NextResponse.json({
        error: 'Could not save - run sql/sales-onboarding.sql',
      }, { status: 500 })
    }
    return NextResponse.json({ success: true, current_step: nextStep })
  } catch (e) {
    logger.error('sales onboarding progress failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
