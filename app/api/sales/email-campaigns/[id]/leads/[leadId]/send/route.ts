import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSingleLead } from '@/lib/email-campaigns'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type RouteContext = { params: { id: string; leadId: string } }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { id: campaignId, leadId } = params

    // Verify the campaign belongs to this rep
    const { data: camp } = await supabaseAdmin
      .from('email_campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('created_by', auth.userId)
      .single()

    if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const result = await sendSingleLead(campaignId, leadId)

    if (!result.sent) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('POST /api/sales/email-campaigns/[id]/leads/[leadId]/send failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
