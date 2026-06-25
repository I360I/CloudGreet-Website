import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

// GET /api/sales/email-campaigns/[id] - campaign detail + its leads
// Rep must own the campaign (created_by = auth.userId)
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { id } = params

    const [campaignRes, leadsRes] = await Promise.all([
      supabaseAdmin
        .from('email_campaigns')
        .select('*')
        .eq('id', id)
        .eq('created_by', auth.userId)
        .single(),
      supabaseAdmin
        .from('email_leads')
        .select('id, email, owner_name, business_name, city, phone, source, status, sent_at, resend_message_id, error, created_at')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    if (campaignRes.error || !campaignRes.data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      campaign: campaignRes.data,
      leads: leadsRes.data || [],
    })
  } catch (err) {
    logger.error('GET /api/sales/email-campaigns/[id] failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/sales/email-campaigns/[id] - update editable fields (signature, name, subject, body_template)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json().catch(() => ({}))

    const allowed = ['signature', 'name', 'subject', 'body_template', 'reply_to'] as const
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { error } = await supabaseAdmin
      .from('email_campaigns')
      .update(update)
      .eq('id', id)
      .eq('created_by', auth.userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('PATCH /api/sales/email-campaigns/[id] failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
