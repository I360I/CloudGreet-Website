import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { buildPrefill, mergeAnswers } from '@/lib/customization/prefill'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/customize/state
 *
 * Auth'd as the client. Returns:
 *   business:   { id, business_name } - for the branded header
 *   answers:    prefill ∪ any saved partial answers
 *   status:     not_sent | sent | submitted | building | ready | live
 *   submitted_at, ready_at
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', auth.businessId)
      .single()
    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Owner name - look up the auth'd user.
    let ownerName: string | null = null
    if (auth.userId) {
      const { data: u } = await supabaseAdmin
        .from('custom_users')
        .select('name, first_name, last_name')
        .eq('id', auth.userId)
        .maybeSingle()
      ownerName = (u as any)?.name
        || [(u as any)?.first_name, (u as any)?.last_name].filter(Boolean).join(' ').trim()
        || null
    }

    // Try to find an originating lead via the close → business link, so
    // scraped fields (services, contact, address) flow into the prefill
    // when the business row is sparse.
    let lead: any = null
    const { data: close } = await supabaseAdmin
      .from('closes')
      .select('id, prospect_business_name, prospect_contact_name, prospect_phone, notes')
      .eq('business_id', auth.businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (close) {
      // The close.notes string sometimes contains a lead id; pull from
      // lead_assignments directly via the close's rep is more work than
      // it's worth here. Use the close's denormalized fields instead.
      lead = {
        contact_name: (close as any).prospect_contact_name,
        phone: (close as any).prospect_phone,
      }
    }

    const prefill = buildPrefill({ business: business as any, ownerName, lead })
    const saved = (business as any).customization || {}
    const answers = mergeAnswers(prefill, saved)

    return NextResponse.json({
      success: true,
      business: {
        id: (business as any).id,
        business_name: (business as any).business_name || 'your business',
      },
      answers,
      status: (business as any).customization_status || 'not_sent',
      submitted_at: (business as any).customization_submitted_at || null,
      ready_at: (business as any).customization_ready_at || null,
    })
  } catch (e) {
    logger.error('customize state failed', {
      businessId: auth.businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
