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
 * when no Retell number is provisioned yet — UI must handle that.
 */
export async function GET(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const { data } = await supabaseAdmin
  .from('phone_numbers')
  .select('phone_number')
  .eq('business_id', auth.businessId)
  .eq('provider', 'retell')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()
 return NextResponse.json({ phone: data?.phone_number || null })
}
