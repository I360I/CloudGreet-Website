import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type LeadInput = {
  email: string
  owner_name?: string | null
  business_name?: string | null
  city?: string | null
  phone?: string | null
  lead_id?: string | null
}

type RouteContext = { params: { id: string } }

// POST /api/sales/email-campaigns/[id]/leads - bulk add leads to a campaign
// Body: { leads: Array<{email, owner_name?, business_name?, city?, phone?, lead_id?}> }
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.leads)) {
      return NextResponse.json({ error: 'Body must contain a "leads" array' }, { status: 400 })
    }

    // Verify campaign exists and is owned by this rep
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('email_campaigns')
      .select('id')
      .eq('id', id)
      .eq('created_by', auth.userId)
      .single()

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const leads = (body.leads as LeadInput[])
      .filter((l) => l.email && l.email.includes('@'))
      .map((l) => ({
        campaign_id: id,
        email: l.email.trim().toLowerCase(),
        owner_name: l.owner_name || null,
        business_name: l.business_name || null,
        city: l.city || null,
        phone: l.phone || null,
        source: 'rep_leads',
        status: 'queued',
      }))

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses found' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('email_leads')
      .upsert(leads, { onConflict: 'campaign_id,email', ignoreDuplicates: false })
      .select('id')

    if (error) {
      logger.error('Failed to insert rep leads', { error: error.message, campaignId: id, userId: auth.userId })
      return NextResponse.json({ error: 'Failed to insert leads' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || leads.length,
    }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/sales/email-campaigns/[id]/leads failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
