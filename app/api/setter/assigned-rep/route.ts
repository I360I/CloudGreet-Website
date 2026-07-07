import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { proxyBookingUrl } from '@/lib/booking-url'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/setter/assigned-rep
 *
 * The rep this setter's demos flow to, plus that rep's booking link -
 * shown as a copyable pill in the cockpit header so the setter can grab
 * the calendar mid-call without leaving the dialer.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'setter') {
    return NextResponse.json({ error: 'Setter role required' }, { status: 401 })
  }

  const { data: me } = await supabaseAdmin
    .from('custom_users')
    .select('assigned_rep_id')
    .eq('id', auth.userId)
    .maybeSingle()
  const repId = me?.assigned_rep_id
  if (!repId) return NextResponse.json({ success: true, rep: null })

  const [{ data: repUser }, { data: repRow }] = await Promise.all([
    supabaseAdmin.from('custom_users').select('name, first_name, last_name').eq('id', repId).maybeSingle(),
    supabaseAdmin.from('sales_reps').select('booking_url').eq('id', repId).maybeSingle(),
  ])

  const name = repUser?.name
    || [repUser?.first_name, repUser?.last_name].filter(Boolean).join(' ')
    || 'your rep'
  const raw = repRow?.booking_url || null

  return NextResponse.json({
    success: true,
    rep: {
      name,
      // Public-facing (proxied through /book/*) so it's safe to paste.
      booking_url: raw ? proxyBookingUrl(raw) : null,
    },
  })
}
