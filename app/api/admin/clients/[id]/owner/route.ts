import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { syncBusinessKnowledgeBase } from '@/lib/retell-knowledge-base'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/admin/clients/[id]/owner
 * body: { first_name?, last_name?, phone?, email? }
 *
 * Edits the business owner's record on custom_users. Admin-only.
 */
export async function PATCH(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const body = await request.json().catch(() => ({})) as Record<string, unknown>

 const { data: business } = await supabaseAdmin
  .from('businesses')
  .select('id, owner_id')
  .eq('id', params.id)
  .maybeSingle()
 if (!business?.owner_id) {
  return NextResponse.json({ error: 'No owner attached to this client' }, { status: 404 })
 }

 const ALLOWED = new Set(['first_name', 'last_name', 'phone', 'email', 'name'])
 const update: Record<string, any> = {}
 for (const [k, v] of Object.entries(body)) {
  if (ALLOWED.has(k) && (typeof v === 'string' || v === null)) update[k] = v
 }
 // Auto-derive `name` from first/last when both provided.
 if ((update.first_name || update.last_name) && !update.name) {
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
  .eq('id', business.owner_id)

 if (error) {
  logger.error('Owner update failed', { clientId: params.id, error: error.message })
  return NextResponse.json({ error: error.message }, { status: 500 })
 }

 // Refresh the KB so Retell's facts are current (owner name, etc).
 let kb: Awaited<ReturnType<typeof syncBusinessKnowledgeBase>> | null = null
 try { kb = await syncBusinessKnowledgeBase(params.id) } catch { /* non-fatal */ }

 return NextResponse.json({ success: true, kb })
}
