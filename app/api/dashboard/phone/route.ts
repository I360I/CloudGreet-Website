import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/phone
 *
 * Returns the live Retell phone number for the signed-in business so
 * the dashboard top bar (and any other widget) can display the real
 * number to call instead of a hardcoded demo. Returns { phone: null }
 * when no Retell number is provisioned yet - UI must handle that.
 */
export async function GET(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 // Try the canonical source first (phone_numbers w/ provider='retell'),
 // then fall back to ai_agents.phone_number for setups where the admin
 // skipped the phone_numbers insert. Without the fallback the dashboard
 // top bar keeps showing "no Retell number provisioned" even after a
 // working agent is wired.
 const { data: pnRow } = await supabaseAdmin
  .from('phone_numbers')
  .select('phone_number')
  .eq('business_id', auth.businessId)
  .eq('provider', 'retell')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()
 if (pnRow?.phone_number) {
  return NextResponse.json({ phone: pnRow.phone_number })
 }
 const { data: agentRow } = await supabaseAdmin
  .from('ai_agents')
  .select('phone_number')
  .eq('business_id', auth.businessId)
  .maybeSingle()
 return NextResponse.json({ phone: agentRow?.phone_number || null })
}
