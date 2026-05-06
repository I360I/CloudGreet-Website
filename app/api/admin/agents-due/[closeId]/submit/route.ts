import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { postToSlack } from '@/lib/notifications/slack'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/agents-due/[closeId]/submit
 *   body: { test_phone: string, notes?: string }
 *
 * Admin marks the demo agent as ready and pastes in the Retell test
 * number. Once flipped to 'ready', the rep's dashboard surfaces the
 * test phone next to that close so they can call it during the demo.
 *
 * PATCH variants:
 *   { status: 'building' | 'ready' | 'skipped' }      - status-only update
 *   { test_phone, notes? }                            - sets status='ready'
 *   { scheduled_at: ISO }                             - admin-set demo time
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    test_phone?: string; notes?: string; status?: string; scheduled_at?: string
  }

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  let touchedReady = false

  if (body.test_phone !== undefined) {
    const tp = String(body.test_phone || '').trim()
    if (!tp) return NextResponse.json({ error: 'test_phone required' }, { status: 400 })
    update.demo_agent_test_phone = tp
    update.demo_agent_status = 'ready'
    update.demo_agent_built_at = new Date().toISOString()
    touchedReady = true
  }
  if (body.notes !== undefined) {
    update.demo_agent_notes = String(body.notes || '').trim() || null
  }
  if (body.status && !touchedReady) {
    if (!['pending', 'building', 'ready', 'skipped'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    update.demo_agent_status = body.status
    if (body.status === 'ready') update.demo_agent_built_at = new Date().toISOString()
  }
  if (body.scheduled_at) {
    const d = new Date(body.scheduled_at)
    if (!isNaN(d.getTime())) update.demo_scheduled_at = d.toISOString()
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('closes')
      .update(update)
      .eq('id', params.closeId)
    if (error) {
      return NextResponse.json({
        error: 'Could not save - run sql/customization-and-demo-agents.sql',
      }, { status: 500 })
    }

    // Slack ping when the demo agent flips to ready - the rep can now
    // see the test number on their /sales/closes.
    if (touchedReady) {
      void (async () => {
        const { data: c } = await supabaseAdmin
          .from('closes')
          .select('prospect_business_name, rep_id')
          .eq('id', params.closeId)
          .maybeSingle()
        let repName: string | null = null
        if ((c as any)?.rep_id) {
          const { data: u } = await supabaseAdmin
            .from('custom_users')
            .select('name, first_name, last_name, email')
            .eq('id', (c as any).rep_id)
            .maybeSingle()
          repName = (u as any)?.name
            || [(u as any)?.first_name, (u as any)?.last_name].filter(Boolean).join(' ').trim()
            || (u as any)?.email
            || null
        }
        await postToSlack({
          text: `:robot_face: Demo agent ready - ${(c as any)?.prospect_business_name || 'client'}${repName ? ` (rep: ${repName})` : ''} · test: ${update.demo_agent_test_phone}`,
        })
      })()
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('admin agents-due submit failed', {
      closeId: params.closeId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
