import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PUT /api/admin/clients/[id]/retell-phone
 * body: { phone: string | null }
 *
 * Set (or clear) the Retell phone number for a client. Stored in
 * phone_numbers with provider='retell'. Setting phone=null/empty
 * deletes the row so the dashboard correctly says "no number
 * provisioned" instead of showing a stale value.
 */
export async function PUT(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const body = await request.json().catch(() => null) as { phone?: string | null } | null
 const raw = (body?.phone ?? '').toString().trim()

 try {
  if (!raw) {
   await supabaseAdmin
    .from('phone_numbers')
    .delete()
    .eq('business_id', params.id)
    .eq('provider', 'retell')
   // Also clear the legacy column on ai_agents if present.
   await supabaseAdmin
    .from('ai_agents')
    .update({ phone_number: null })
    .eq('business_id', params.id)
   return NextResponse.json({ success: true, phone: null })
  }

  // Normalize: keep digits + leading +, then re-add + if 10/11 digits
  const cleaned = raw.replace(/[^0-9+]/g, '')
  const digits = cleaned.replace(/[^0-9]/g, '')
  let normalized = cleaned
  if (!cleaned.startsWith('+') && digits.length === 10) normalized = `+1${digits}`
  else if (!cleaned.startsWith('+') && digits.length === 11) normalized = `+${digits}`

  // Delete any existing row first so we don't accumulate stale entries
  await supabaseAdmin
   .from('phone_numbers')
   .delete()
   .eq('business_id', params.id)
   .eq('provider', 'retell')
  const { error } = await supabaseAdmin
   .from('phone_numbers')
   .insert({
    business_id: params.id,
    phone_number: normalized,
    provider: 'retell',
    status: 'active',
   })
  if (error) {
   logger.error('Failed to set retell phone', { error: error.message, clientId: params.id })
   return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Best-effort sync to ai_agents.phone_number for legacy reads.
  await supabaseAdmin
   .from('ai_agents')
   .update({ phone_number: normalized })
   .eq('business_id', params.id)

  return NextResponse.json({ success: true, phone: normalized })
 } catch (e) {
  logger.error('Retell phone update failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to update phone' }, { status: 500 })
 }
}
