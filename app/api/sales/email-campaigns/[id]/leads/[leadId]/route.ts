import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string; leadId: string } }

// PATCH /api/sales/email-campaigns/[id]/leads/[leadId]
// Supports: { replied: true } to mark as replied and stop sequence
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { id: campaignId, leadId } = params
  const body = await request.json().catch(() => ({}))

  // Verify the campaign belongs to this rep
  const { data: camp } = await supabaseAdmin
    .from('email_campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('created_by', auth.userId)
    .maybeSingle()

  if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (body.replied === true) {
    const { error } = await supabaseAdmin
      .from('email_leads')
      .update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        next_follow_up_at: null, // stop the sequence
      })
      .eq('id', leadId)
      .eq('campaign_id', campaignId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
