import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { fetchUpcomingCalBookings } from '@/lib/sales/cal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/agents-due
 *
 * Surface for the admin "Agents Due" page. Returns every close that
 * has been provisioned (has a business_id) but doesn't yet have a
 * demo agent marked ready - i.e. the queue of agents you need to build
 * before each rep's demo call.
 *
 * Per row we hand back everything the admin needs to build the agent
 * without bouncing around the dashboard:
 *   · rep:                name + email
 *   · prospect:           name, email, phone (from the close + lead/business)
 *   · business:           id, name, address, services, hours,
 *                          login_email (so admin knows what account was provisioned),
 *                          cal_com_username + event_type_slug + has_api_key
 *                          (so admin can paste the calendar wiring straight into Retell)
 *   · demo:               scheduled_at if set, status, test_phone (when ready)
 *   · created_at, updated_at
 *
 * Cal.com upcoming bookings are pulled lazily per rep (best-effort) and
 * matched to closes by prospect email, so a rep that hasn't connected
 * their Cal key just shows demo_scheduled_at=null and that's fine.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: closes, error } = await supabaseAdmin
      .from('closes')
      .select(
        'id, rep_id, business_id, prospect_business_name, prospect_contact_name, prospect_email, prospect_phone, status, demo_scheduled_at, demo_agent_status, demo_agent_test_phone, demo_agent_built_at, demo_agent_notes, created_at, updated_at',
      )
      .not('business_id', 'is', null)
      .neq('demo_agent_status', 'ready')
      .neq('demo_agent_status', 'skipped')
      .order('demo_scheduled_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const rows = closes || []
    if (rows.length === 0) {
      return NextResponse.json({ success: true, items: [] })
    }

    const repIds = Array.from(new Set(rows.map((r) => r.rep_id)))
    const bizIds = Array.from(new Set(rows.map((r) => r.business_id).filter(Boolean) as string[]))

    const [{ data: reps }, { data: repProfiles }, { data: businesses }, { data: clientUsers }] = await Promise.all([
      supabaseAdmin
        .from('custom_users')
        .select('id, email, name, first_name, last_name')
        .in('id', repIds),
      supabaseAdmin
        .from('sales_reps')
        .select('id, cal_api_key')
        .in('id', repIds),
      supabaseAdmin
        .from('businesses')
        .select(
          'id, business_name, address, services, business_hours, website, cal_com_username, cal_com_event_type_slug, cal_com_api_key, customization_status, customization_submitted_at',
        )
        .in('id', bizIds),
      // Pull the owner login email per business via custom_users.business_id
      supabaseAdmin
        .from('custom_users')
        .select('id, email, business_id, role')
        .in('business_id', bizIds)
        .eq('role', 'owner'),
    ])

    const repById = new Map<string, any>()
    for (const u of reps || []) repById.set(u.id, u)
    const repProfileById = new Map<string, any>()
    for (const p of repProfiles || []) repProfileById.set(p.id, p)
    const bizById = new Map<string, any>()
    for (const b of businesses || []) bizById.set(b.id, b)
    const ownerByBiz = new Map<string, any>()
    for (const u of clientUsers || []) ownerByBiz.set(u.business_id, u)

    // Best-effort: pull each rep's upcoming Cal.com bookings and index
    // by attendee email so we can attach a scheduled time to closes
    // where demo_scheduled_at is null but the prospect did pick a slot.
    const bookingByEmail = new Map<string, { start_iso: string; title: string }>()
    await Promise.all(
      Array.from(repProfileById.values())
        .filter((p) => p.cal_api_key)
        .map(async (p) => {
          try {
            const bookings = await fetchUpcomingCalBookings(p.cal_api_key, { take: 25 })
            for (const b of bookings || []) {
              for (const a of (b as any).attendees || []) {
                const e = (a?.email || '').toLowerCase().trim()
                if (e && !bookingByEmail.has(e)) {
                  bookingByEmail.set(e, { start_iso: (b as any).start_iso, title: (b as any).title })
                }
              }
            }
          } catch { /* non-fatal */ }
        }),
    )

    const items = rows.map((r) => {
      const rep = repById.get(r.rep_id) || {}
      const biz = r.business_id ? bizById.get(r.business_id) || {} : {}
      const owner = r.business_id ? ownerByBiz.get(r.business_id) : null
      const calMatch = r.prospect_email
        ? bookingByEmail.get(r.prospect_email.toLowerCase().trim())
        : undefined
      const scheduledAt = r.demo_scheduled_at || calMatch?.start_iso || null

      return {
        close_id: r.id,
        created_at: r.created_at,
        updated_at: r.updated_at,
        demo: {
          scheduled_at: scheduledAt,
          status: r.demo_agent_status || 'pending',
          test_phone: r.demo_agent_test_phone || null,
          built_at: r.demo_agent_built_at || null,
          notes: r.demo_agent_notes || null,
        },
        rep: {
          id: r.rep_id,
          name: rep.name || [rep.first_name, rep.last_name].filter(Boolean).join(' ').trim() || rep.email || 'Rep',
          email: rep.email || null,
        },
        prospect: {
          name: r.prospect_contact_name,
          email: r.prospect_email,
          phone: r.prospect_phone,
          business_name: r.prospect_business_name,
        },
        business: r.business_id ? {
          id: r.business_id,
          business_name: biz.business_name || r.prospect_business_name,
          address: biz.address || null,
          services: biz.services || [],
          business_hours: biz.business_hours || null,
          website: biz.website || null,
          login_email: owner?.email || null,
          cal_com_username: biz.cal_com_username || null,
          cal_com_event_type_slug: biz.cal_com_event_type_slug || null,
          has_cal_api_key: !!biz.cal_com_api_key,
          customization_status: biz.customization_status || 'not_sent',
          customization_submitted_at: biz.customization_submitted_at || null,
        } : null,
      }
    })

    return NextResponse.json({ success: true, items })
  } catch (e) {
    logger.error('admin agents-due failed', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
