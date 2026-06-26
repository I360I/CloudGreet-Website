import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { sendCampaignBatch } from '@/lib/email-campaigns'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

// POST /api/sales/email-campaigns/[id]/send - trigger a batch send
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json().catch(() => ({}))
    const batchSize = typeof body?.batchSize === 'number' ? body.batchSize : 50

    // Verify campaign exists and is owned by this rep
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('email_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('created_by', auth.userId)
      .single()

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status === 'paused') {
      return NextResponse.json({ error: 'Campaign is paused. Resume it first.' }, { status: 409 })
    }

    // Set campaign to sending
    await supabaseAdmin
      .from('email_campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', id)

    const result = await sendCampaignBatch(id, batchSize)

    // Check if there are remaining queued leads
    const { count } = await supabaseAdmin
      .from('email_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('status', 'queued')

    if ((count || 0) === 0) {
      await supabaseAdmin
        .from('email_campaigns')
        .update({ status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', id)
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    logger.error('POST /api/sales/email-campaigns/[id]/send failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 })
  }
}
