import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

// GET /api/sales/email-campaigns/[id]/sequences
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { id } = params

  // Verify campaign belongs to this rep
  const { data: camp } = await supabaseAdmin
    .from('email_campaigns')
    .select('id')
    .eq('id', id)
    .eq('created_by', auth.userId)
    .maybeSingle()

  if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const { data: steps, error } = await supabaseAdmin
    .from('campaign_sequences')
    .select('id, step_number, delay_days, subject_template, body_template')
    .eq('campaign_id', id)
    .order('step_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, steps: steps || [] })
}

// PUT /api/sales/email-campaigns/[id]/sequences
// Replaces all sequence steps for this campaign.
// Body: { steps: [{ step_number, delay_days, subject_template, body_template }] }
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { id } = params
  const body = await request.json().catch(() => ({}))
  const steps: { step_number: number; delay_days: number; subject_template: string; body_template: string }[] =
    body?.steps || []

  // Verify campaign belongs to this rep
  const { data: camp } = await supabaseAdmin
    .from('email_campaigns')
    .select('id')
    .eq('id', id)
    .eq('created_by', auth.userId)
    .maybeSingle()

  if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Validate
  for (const step of steps) {
    if (!step.step_number || step.delay_days < 1 || !step.subject_template?.trim() || !step.body_template?.trim()) {
      return NextResponse.json({ error: 'Each step needs step_number, delay_days ≥ 1, subject_template, body_template' }, { status: 400 })
    }
  }

  // Delete existing steps then insert new ones
  const { error: delErr } = await supabaseAdmin
    .from('campaign_sequences')
    .delete()
    .eq('campaign_id', id)

  if (delErr) {
    logger.error('sequences PUT: delete failed', { error: delErr.message })
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  if (steps.length > 0) {
    const rows = steps.map((s) => ({
      campaign_id: id,
      step_number: s.step_number,
      delay_days: s.delay_days,
      subject_template: s.subject_template.trim(),
      body_template: s.body_template.trim(),
    }))

    const { error: insErr } = await supabaseAdmin.from('campaign_sequences').insert(rows)
    if (insErr) {
      logger.error('sequences PUT: insert failed', { error: insErr.message })
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
