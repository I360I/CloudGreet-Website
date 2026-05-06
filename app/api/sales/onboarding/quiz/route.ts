import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { gradeQuiz } from '@/lib/sales/onboarding-quiz'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/onboarding/quiz
 * body: { answers: Record<questionId, optionIndex> }
 *
 * Grades the answers, increments quiz_attempts, stamps last_quiz_score,
 * and on pass stamps quiz_passed_at + onboarding_completed_at.
 *
 * Returns the graded result (per-question correct/wrong + which video
 * step to rewatch for any wrong answer) so the UI can show feedback
 * without a second round-trip.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { answers?: Record<string, number> }
  const answers = body.answers || {}

  try {
    const result = gradeQuiz(answers)

    const { data: rep } = await supabaseAdmin
      .from('sales_reps')
      .select('quiz_attempts, quiz_passed_at, onboarding_completed_at')
      .eq('id', auth.userId)
      .maybeSingle()

    const update: Record<string, any> = {
      quiz_attempts: ((rep as any)?.quiz_attempts ?? 0) + 1,
      last_quiz_score: result.scorePct,
      updated_at: new Date().toISOString(),
    }
    if (result.passed) {
      const now = new Date().toISOString()
      if (!(rep as any)?.quiz_passed_at) update.quiz_passed_at = now
      if (!(rep as any)?.onboarding_completed_at) update.onboarding_completed_at = now
    }

    const { error: updErr } = await supabaseAdmin
      .from('sales_reps')
      .update(update)
      .eq('id', auth.userId)
    if (updErr) {
      return NextResponse.json({
        error: 'Could not save - run sql/sales-onboarding.sql',
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    logger.error('sales onboarding quiz failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
