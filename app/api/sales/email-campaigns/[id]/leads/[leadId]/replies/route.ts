import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string; leadId: string } }

// GET /api/sales/email-campaigns/[id]/leads/[leadId]/replies
// Returns the reply thread for a single lead (including original email from email_leads)
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { id: campaignId, leadId } = params

  // Verify campaign belongs to this rep
  const { data: camp } = await supabaseAdmin
    .from('email_campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('created_by', auth.userId)
    .maybeSingle()

  if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const [leadRes, repliesRes] = await Promise.all([
    supabaseAdmin
      .from('email_leads')
      .select('id, email, owner_name, personalized_subject, personalized_body, sent_at, replied_at')
      .eq('id', leadId)
      .eq('campaign_id', campaignId)
      .single(),
    supabaseAdmin
      .from('email_lead_replies')
      .select('id, from_email, from_name, subject, body, received_at')
      .eq('lead_id', leadId)
      .order('received_at', { ascending: true }),
  ])

  if (leadRes.error || !leadRes.data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    lead: leadRes.data,
    replies: repliesRes.data || [],
  })
}
