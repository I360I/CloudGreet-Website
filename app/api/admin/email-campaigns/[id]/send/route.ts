import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { sendCampaignBatch } from '@/lib/email-campaigns'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json().catch(() => ({}))
    const batchSize = typeof body?.batchSize === 'number' ? body.batchSize : 50

    // Verify campaign exists
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('email_campaigns')
      .select('id, status')
      .eq('id', id)
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
    logger.error('POST /api/admin/email-campaigns/[id]/send failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 })
  }
}
