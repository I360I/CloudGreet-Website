import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/me/profile  → current user's first/last/name/phone/email
 * PATCH /api/me/profile → edit your own profile (signed-in user)
 *
 * Email is read-only here - changes route through a separate verify
 * flow (not built yet).
 */

export async function GET(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const { data, error } = await supabaseAdmin
  .from('custom_users')
  .select('id, email, first_name, last_name, name, phone')
  .eq('id', auth.userId)
  .maybeSingle()
 if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
 return NextResponse.json({ success: true, profile: data })
}

export async function PATCH(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const body = await request.json().catch(() => ({})) as Record<string, unknown>

 const ALLOWED = new Set(['first_name', 'last_name', 'phone'])
 const update: Record<string, any> = {}
 for (const [k, v] of Object.entries(body)) {
  if (ALLOWED.has(k) && (typeof v === 'string' || v === null)) update[k] = v
 }
 if ((update.first_name || update.last_name)) {
  const first = (update.first_name || '').toString().trim()
  const last = (update.last_name || '').toString().trim()
  const composed = `${first} ${last}`.trim()
  if (composed) update.name = composed
 }
 if (Object.keys(update).length === 0) {
  return NextResponse.json({ error: 'No editable fields' }, { status: 400 })
 }
 update.updated_at = new Date().toISOString()

 const { error } = await supabaseAdmin
  .from('custom_users')
  .update(update)
  .eq('id', auth.userId)
 if (error) {
  logger.error('Self profile update failed', { userId: auth.userId, error: error.message })
  return NextResponse.json({ error: error.message }, { status: 500 })
 }

 // If the owner changed their phone, that IS the transfer destination
 // they want callers routed to (the settings UI is labeled "Call
 // transfer destination"). The agent wiring code falls through a
 // precedence chain: businesses.escalation_phone -> notifications_phone
 // -> custom_users.phone. If notifications_phone or escalation_phone
 // was already set from onboarding, the contractor's edit to their
 // own phone would be silently shadowed - this is the bug a customer
 // hit where the first save worked but every subsequent edit didn't.
 //
 // Stamp businesses.escalation_phone with the same value so the
 // precedence chain always reads the contractor's latest edit.
 if (typeof update.phone === 'string' && auth.businessId) {
  await supabaseAdmin
   .from('businesses')
   .update({
    escalation_phone: update.phone || null,
    updated_at: new Date().toISOString(),
   })
   .eq('id', auth.businessId)
   .then(undefined, (e) => {
    logger.warn('escalation_phone mirror update failed', {
     businessId: auth.businessId,
     error: e instanceof Error ? e.message : 'Unknown',
    })
    return null
   })
 }

 // Re-push the tool set so transfers route to the new number.
 // Synchronous so any Retell-side failure (rejected E.164, etc.)
 // surfaces in the response rather than disappearing into logs.
 let toolsError: string | null = null
 let toolsTrace: string[] = []
 if (typeof update.phone === 'string' && auth.businessId) {
  try {
   const { retellAgentManager } = await import('@/lib/retell-agent-manager')
   toolsTrace = await retellAgentManager().ensureLLMToolsForBusiness(auth.businessId)
  } catch (e) {
   toolsError = e instanceof Error ? e.message : 'Unknown'
   logger.warn('Re-wire tools after profile phone change failed', {
    businessId: auth.businessId,
    error: toolsError,
   })
  }
 }

 return NextResponse.json({ success: true, toolsError, toolsTrace })
}
