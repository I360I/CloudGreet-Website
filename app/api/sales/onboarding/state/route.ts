import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/onboarding/state
 *
 * Returns everything the rep onboarding page needs in one trip:
 *   · current_onboarding_step (1-7)
 *   · onboarding_completed_at
 *   · quiz_attempts, quiz_passed_at, last_quiz_score
 *   · stripe_connect_payouts_enabled - gates step 3
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('sales_reps')
      .select(
        'current_onboarding_step, onboarding_started_at, onboarding_completed_at, quiz_attempts, quiz_passed_at, last_quiz_score, stripe_connect_payouts_enabled',
      )
      .eq('id', auth.userId)
      .maybeSingle()

    if (error) {
      // Columns may be missing on stale deploys - return safe defaults
      // so the page still renders.
      return NextResponse.json({
        success: true,
        current_step: 1,
        onboarding_started_at: null,
        onboarding_completed_at: null,
        quiz_attempts: 0,
        quiz_passed_at: null,
        last_quiz_score: null,
        stripe_payouts_enabled: false,
      })
    }

    return NextResponse.json({
      success: true,
      current_step: (data as any)?.current_onboarding_step ?? 1,
      onboarding_started_at: (data as any)?.onboarding_started_at ?? null,
      onboarding_completed_at: (data as any)?.onboarding_completed_at ?? null,
      quiz_attempts: (data as any)?.quiz_attempts ?? 0,
      quiz_passed_at: (data as any)?.quiz_passed_at ?? null,
      last_quiz_score: (data as any)?.last_quiz_score ?? null,
      stripe_payouts_enabled: !!(data as any)?.stripe_connect_payouts_enabled,
    })
  } catch (e) {
    logger.error('sales onboarding state failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
