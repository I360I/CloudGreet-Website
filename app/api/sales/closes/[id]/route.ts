import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/sales/closes/[id]
 *
 * Rep updates fields they own on their own close. Currently scopes
 * to demo_result + demo_result_notes + demo_scheduled_at - the bits
 * that drive the post-demo lifecycle pill on /sales/closes.
 *
 * Auth: rep must own the close (matches by rep_id == userId).
 */

const VALID_DEMO_RESULTS = [
  'pending', 'won', 'lost', 'no_show', 'needs_followup', 'reschedule', 'ghosted',
] as const
type DemoResult = typeof VALID_DEMO_RESULTS[number]

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    demo_result?: string
    demo_result_notes?: string | null
    demo_scheduled_at?: string | null
  }

  const update: Record<string, any> = { updated_at: new Date().toISOString() }

  if (body.demo_result !== undefined) {
    if (!VALID_DEMO_RESULTS.includes(body.demo_result as DemoResult)) {
      return NextResponse.json({
        error: `demo_result must be one of: ${VALID_DEMO_RESULTS.join(', ')}`,
      }, { status: 400 })
    }
    update.demo_result = body.demo_result
    // Stamp the result_at when transitioning out of pending.
    if (body.demo_result !== 'pending') {
      update.demo_result_at = new Date().toISOString()
    } else {
      update.demo_result_at = null
    }
  }

  if (body.demo_result_notes !== undefined) {
    update.demo_result_notes = body.demo_result_notes || null
  }

  if (body.demo_scheduled_at !== undefined) {
    update.demo_scheduled_at = body.demo_scheduled_at || null
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Verify ownership before update.
  const { data: existing, error: loadErr } = await supabaseAdmin
    .from('closes')
    .select('id, rep_id')
    .eq('id', params.id)
    .single()
  if (loadErr || !existing) {
    return NextResponse.json({ error: 'Close not found' }, { status: 404 })
  }
  if (existing.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('closes')
    .update(update)
    .eq('id', params.id)
  if (error) {
    logger.warn('sales close PATCH failed', { id: params.id, error: error.message })
    return NextResponse.json({
      error: error.message.includes('demo_result')
        ? 'Run sql/closes-demo-result.sql first - the demo_result column is missing.'
        : error.message,
    }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
