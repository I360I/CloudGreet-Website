import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/agents-due/[closeId]
 *
 * Single-close fetch for the per-close workspace at
 * /admin/agents-due/[closeId]. Same shape as the list endpoint's items[]
 * but ignores the status filter so admins can revisit ready/skipped
 * builds (e.g. to copy the prompt back out).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(_request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: r, error } = await supabaseAdmin
    .from('closes')
    .select(
      'id, rep_id, business_id, prospect_business_name, prospect_contact_name, prospect_email, prospect_phone, status, demo_scheduled_at, demo_agent_status, demo_agent_test_phone, demo_agent_built_at, demo_agent_notes, agent_draft_status, agent_draft_generated_at, agent_draft_approved_at, created_at, updated_at',
    )
    .eq('id', params.closeId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: rep }, biz, owner] = await Promise.all([
    supabaseAdmin
      .from('custom_users')
      .select('id, email, name, first_name, last_name')
      .eq('id', r.rep_id)
      .maybeSingle(),
    r.business_id
      ? supabaseAdmin
          .from('businesses')
          .select(
            'id, business_name, address, services, business_hours, website, cal_com_username, cal_com_event_type_slug, cal_com_api_key, customization_status, customization_submitted_at',
          )
          .eq('id', r.business_id)
          .maybeSingle()
          .then((res) => res.data)
      : Promise.resolve(null),
    r.business_id
      ? supabaseAdmin
          .from('custom_users')
          .select('id, email, business_id, role')
          .eq('business_id', r.business_id)
          .eq('role', 'owner')
          .maybeSingle()
          .then((res) => res.data)
      : Promise.resolve(null),
  ])

  const repName =
    rep?.name ||
    [rep?.first_name, rep?.last_name].filter(Boolean).join(' ').trim() ||
    rep?.email ||
    'Rep'

  const item = {
    close_id: r.id,
    created_at: r.created_at,
    updated_at: r.updated_at,
    agent_draft: {
      status: (r as any).agent_draft_status || 'none',
      generated_at: (r as any).agent_draft_generated_at || null,
      approved_at: (r as any).agent_draft_approved_at || null,
    },
    demo: {
      scheduled_at: r.demo_scheduled_at || null,
      status: r.demo_agent_status || 'pending',
      test_phone: r.demo_agent_test_phone || null,
      built_at: r.demo_agent_built_at || null,
      notes: r.demo_agent_notes || null,
    },
    rep: { id: r.rep_id, name: repName, email: rep?.email || null },
    prospect: {
      name: r.prospect_contact_name,
      email: r.prospect_email,
      phone: r.prospect_phone,
      business_name: r.prospect_business_name,
    },
    business: r.business_id && biz
      ? {
          id: r.business_id,
          business_name: (biz as any).business_name || r.prospect_business_name,
          address: (biz as any).address || null,
          services: (biz as any).services || [],
          business_hours: (biz as any).business_hours || null,
          website: (biz as any).website || null,
          login_email: (owner as any)?.email || null,
          cal_com_username: (biz as any).cal_com_username || null,
          cal_com_event_type_slug: (biz as any).cal_com_event_type_slug || null,
          has_cal_api_key: !!(biz as any).cal_com_api_key,
          customization_status: (biz as any).customization_status || 'not_sent',
          customization_submitted_at: (biz as any).customization_submitted_at || null,
        }
      : null,
  }

  return NextResponse.json({ success: true, item })
}
