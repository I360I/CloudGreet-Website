import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { resolveBusinessTimezone, timezoneForState } from '@/lib/timezones'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/diagnostics/business-tz?businessId=...
 *
 * Shows the timezone state for a business + what `resolveBusinessTimezone`
 * would return. Use this when the agent is booking the wrong time zone:
 * usually `businesses.timezone` is set to a stale value, or state is wrong.
 *
 * POST /api/admin/diagnostics/business-tz?businessId=...
 *   body: { timezone: 'America/Chicago' }
 * Overrides the timezone column.
 */
export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const id = request.nextUrl.searchParams.get('businessId')?.trim()
 if (!id) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('id, business_name, state, timezone, cal_com_username, cal_com_event_type_slug, cal_com_event_type_id')
  .eq('id', id)
  .maybeSingle()
 if (!biz) return NextResponse.json({ error: 'business not found' }, { status: 404 })

 const resolved = resolveBusinessTimezone({
  explicit: (biz as any).timezone,
  state: (biz as any).state,
 })

 return NextResponse.json({
  business: biz,
  resolved_timezone: resolved,
  explanation: (biz as any).timezone
   ? `using explicit businesses.timezone (${(biz as any).timezone})`
   : `using state-based mapping for state="${(biz as any).state || '∅'}" → ${resolved}`,
 })
}

export async function POST(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const id = request.nextUrl.searchParams.get('businessId')?.trim()
 if (!id) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

 const body = await request.json().catch(() => ({})) as { timezone?: string }
 let tz = body.timezone?.trim()

 // Convenience: with no body, default to America/Chicago. Lets the
 // user hit the URL with a browser-form POST or curl with no payload
 // to unstick a wrong-tz business without typing the IANA name.
 if (!tz) tz = 'America/Chicago'

 const { error } = await supabaseAdmin
  .from('businesses')
  .update({ timezone: tz, updated_at: new Date().toISOString() })
  .eq('id', id)
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })

 return NextResponse.json({ success: true, businessId: id, timezone: tz })
}

/**
 * PATCH /api/admin/diagnostics/business-tz?businessId=...
 *
 * Re-derive timezone from `businesses.state` and save. Use when state
 * was populated after the original timezone was stamped.
 */
export async function PATCH(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const id = request.nextUrl.searchParams.get('businessId')?.trim()
 if (!id) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('state')
  .eq('id', id)
  .maybeSingle()
 if (!biz) return NextResponse.json({ error: 'business not found' }, { status: 404 })

 const stateTz = timezoneForState((biz as any).state) || 'America/Chicago'
 const { error } = await supabaseAdmin
  .from('businesses')
  .update({ timezone: stateTz, updated_at: new Date().toISOString() })
  .eq('id', id)
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })

 return NextResponse.json({
  success: true, businessId: id, state: (biz as any).state || null, timezone: stateTz,
 })
}
