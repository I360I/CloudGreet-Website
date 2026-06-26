import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type LeadInput = {
  email: string
  owner_name?: string
  business_name?: string
  city?: string
  phone?: string
  source?: string
}

type RouteContext = { params: { id: string } }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.leads)) {
      return NextResponse.json({ error: 'Body must contain a "leads" array' }, { status: 400 })
    }

    // Verify campaign exists
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('email_campaigns')
      .select('id')
      .eq('id', id)
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
        source: l.source || 'manual',
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
      logger.error('Failed to insert leads', { error: error.message, campaignId: id })
      return NextResponse.json({ error: 'Failed to insert leads' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || leads.length,
    }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/admin/email-campaigns/[id]/leads failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
