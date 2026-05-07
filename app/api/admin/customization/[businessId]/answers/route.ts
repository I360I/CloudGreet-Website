import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { buildPrefill, mergeAnswers } from '@/lib/customization/prefill'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin-side mirror of /api/customize/state and /api/customize/save.
 *
 * Difference from the client-facing routes: those scope to the auth'd
 * client's own businessId. These take an explicit businessId in the
 * URL and require admin auth, so an admin can pre-fill / edit any
 * business's customization on behalf of the rep.
 *
 * Whatever the admin saves lands in the same `businesses.customization`
 * jsonb column. When the client opens /dashboard/customize they see
 * the admin's pre-fill alongside (and on top of) the auto-prefill from
 * lead/Places data.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', params.businessId)
      .single()
    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const lead = await loadLeadForBusiness(params.businessId)
    const prefill = buildPrefill({
      business: business as any,
      ownerName: await loadOwnerName(params.businessId),
      lead,
    })
    const saved = (business as any).customization || {}
    const answers = mergeAnswers(prefill, saved)

    return NextResponse.json({
      success: true,
      business: {
        id: (business as any).id,
        business_name: (business as any).business_name || 'Untitled business',
      },
      answers,
      prefill,
      saved,
      status: (business as any).customization_status || 'not_sent',
      submitted_at: (business as any).customization_submitted_at || null,
      ready_at: (business as any).customization_ready_at || null,
    })
  } catch (e) {
    logger.error('admin customize state failed', {
      businessId: params.businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { businessId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { answers?: Record<string, any> }
  if (!body.answers || typeof body.answers !== 'object') {
    return NextResponse.json({ error: 'answers must be an object' }, { status: 400 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('businesses')
      .update({
        customization: body.answers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.businessId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('admin customize save failed', {
      businessId: params.businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

async function loadOwnerName(businessId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('custom_users')
    .select('name, first_name, last_name')
    .eq('business_id', businessId)
    .eq('role', 'owner')
    .maybeSingle()
  if (!data) return null
  return (data as any).name
    || [(data as any).first_name, (data as any).last_name].filter(Boolean).join(' ').trim()
    || null
}

async function loadLeadForBusiness(businessId: string): Promise<any | null> {
  const { data: close } = await supabaseAdmin
    .from('closes')
    .select('id, prospect_business_name, prospect_contact_name, prospect_phone')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!close) return null
  return {
    contact_name: (close as any).prospect_contact_name,
    phone: (close as any).prospect_phone,
  }
}
