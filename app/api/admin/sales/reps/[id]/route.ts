import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Per-rep detail. GET returns rep + KPIs + their clients + commissions
 * + recent closes. PATCH updates status (terminate / reactivate / pause).
 * DELETE hard-removes the rep entirely (only allowed when they have no
 * commission history; otherwise you must terminate, which keeps the
 * audit trail intact).
 */

export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })

 const repId = params.id

 const { data: user } = await supabaseAdmin
  .from('custom_users')
  .select('id, email, first_name, last_name, name, last_login, created_at, role')
  .eq('id', repId)
  .maybeSingle()
 if (!user || user.role !== 'sales') {
  return NextResponse.json({ error: 'Sales rep not found' }, { status: 404 })
 }

 const [{ data: profile }, { data: clients }, { data: commissions }, { data: closes }] = await Promise.all([
  supabaseAdmin.from('sales_reps').select('*').eq('id', repId).maybeSingle(),
  supabaseAdmin
   .from('businesses')
   .select('id, business_name, subscription_status, monthly_price_cents, setup_fee_cents, created_at')
   .eq('rep_id', repId)
   .order('created_at', { ascending: false }),
  supabaseAdmin
   .from('commission_ledger')
   .select('id, business_id, source_type, gross_paid_cents, commission_cents, earned_at, payout_id')
   .eq('rep_id', repId)
   .order('earned_at', { ascending: false })
   .limit(50),
  supabaseAdmin
   .from('closes')
   .select('id, prospect_business_name, agreed_monthly_cents, agreed_setup_fee_cents, status, created_at')
   .eq('rep_id', repId)
   .order('created_at', { ascending: false })
   .limit(50),
 ])

 const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
 let mtdCommission = 0
 let lifetimeCommission = 0
 let outstanding = 0
 for (const c of commissions || []) {
  lifetimeCommission += c.commission_cents
  if (new Date(c.earned_at) >= startOfMonth) mtdCommission += c.commission_cents
  if (!c.payout_id) outstanding += c.commission_cents
 }

 return NextResponse.json({
  success: true,
  rep: {
   id: user.id,
   email: user.email,
   name: user.name || [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email,
   first_name: user.first_name,
   last_name: user.last_name,
   created_at: user.created_at,
   last_login: user.last_login,
   status: profile?.status || 'active',
   legal_name: profile?.legal_name || null,
   street_address: profile?.street_address || null,
   city: profile?.city || null,
   state: profile?.state || null,
   zip_code: profile?.zip_code || null,
   agreement_version: profile?.agreement_version || null,
   agreement_signed_at: profile?.agreement_signed_at || null,
   stripe_connect_account_id: profile?.stripe_connect_account_id || null,
   stripe_payouts_enabled: !!profile?.stripe_connect_payouts_enabled,
   stripe_details_submitted: !!profile?.stripe_connect_details_submitted,
   terminated_at: profile?.terminated_at || null,
   lead_scrape_limit: profile?.lead_scrape_limit ?? 100,
  },
  kpis: {
   mtd_commission_cents: mtdCommission,
   lifetime_commission_cents: lifetimeCommission,
   outstanding_commission_cents: outstanding,
   client_count: (clients || []).length,
   close_count: (closes || []).length,
  },
  clients: clients || [],
  commissions: commissions || [],
  closes: closes || [],
 })
}

export async function PATCH(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })

 const body = await request.json().catch(() => ({})) as {
  status?: 'active' | 'paused' | 'terminated'
  first_name?: string
  last_name?: string
  lead_scrape_limit?: number
 }

 const userPatch: Record<string, any> = {}
 if (typeof body.first_name === 'string') userPatch.first_name = body.first_name.trim()
 if (typeof body.last_name === 'string') userPatch.last_name = body.last_name.trim()
 if (Object.keys(userPatch).length > 0) {
  if (userPatch.first_name && userPatch.last_name) {
   userPatch.name = `${userPatch.first_name} ${userPatch.last_name}`.trim()
  }
  userPatch.updated_at = new Date().toISOString()
  await supabaseAdmin.from('custom_users').update(userPatch).eq('id', params.id)
 }

 const repPatch: Record<string, any> = {}
 if (body.status && ['active', 'paused', 'terminated'].includes(body.status)) {
  repPatch.status = body.status
  repPatch.terminated_at = body.status === 'terminated' ? new Date().toISOString() : null
 }
 if (typeof body.lead_scrape_limit === 'number') {
  const n = Math.floor(body.lead_scrape_limit)
  if (n < 1 || n > 10000) {
   return NextResponse.json({ error: 'lead_scrape_limit must be between 1 and 10000' }, { status: 400 })
  }
  repPatch.lead_scrape_limit = n
 }
 if (Object.keys(repPatch).length > 0) {
  repPatch.updated_at = new Date().toISOString()
  await supabaseAdmin.from('sales_reps').update(repPatch).eq('id', params.id)
 }

 // Terminating revokes login by flipping is_active false on the user.
 if (body.status === 'terminated') {
  await supabaseAdmin
   .from('custom_users')
   .update({ is_active: false, status: 'inactive', updated_at: new Date().toISOString() })
   .eq('id', params.id)
 } else if (body.status === 'active') {
  await supabaseAdmin
   .from('custom_users')
   .update({ is_active: true, status: 'active', updated_at: new Date().toISOString() })
   .eq('id', params.id)
 }

 return NextResponse.json({ success: true })
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })

 // Block hard-delete if the rep has any commission history. Audit
 // trail must survive — they got paid, we owe them a 1099 next year.
 // Admin must terminate (status='terminated') instead.
 const { count: commissionCount } = await supabaseAdmin
  .from('commission_ledger')
  .select('id', { count: 'exact', head: true })
  .eq('rep_id', params.id)

 if ((commissionCount ?? 0) > 0) {
  return NextResponse.json({
   error: 'This rep has commission history — terminate them instead of deleting (keeps the 1099 trail intact).',
  }, { status: 409 })
 }

 // Detach from any clients (so business rows survive but the rep
 // pointer goes to null).
 await supabaseAdmin.from('businesses').update({ rep_id: null }).eq('rep_id', params.id)
 await supabaseAdmin.from('lead_assignments').delete().eq('rep_id', params.id)
 await supabaseAdmin.from('closes').delete().eq('rep_id', params.id)
 await supabaseAdmin.from('sales_reps').delete().eq('id', params.id)
 await supabaseAdmin.from('custom_users').delete().eq('id', params.id)

 logger.info('Admin hard-deleted sales rep', { repId: params.id })
 return NextResponse.json({ success: true })
}
