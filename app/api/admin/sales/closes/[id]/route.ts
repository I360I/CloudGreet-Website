import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED = new Set(['pending', 'invoice_sent', 'paid', 'cancelled', 'rejected'])

/**
 * PATCH /api/admin/sales/closes/[id]
 *   { status?: 'pending'|'invoice_sent'|'paid'|'cancelled'|'rejected',
 *     business_id?: string|null }
 *
 * Lightweight admin override for a close's status and the business
 * it's linked to. The Stripe invoice.paid webhook is still the
 * source of truth for `paid` + commission ledger writes; this
 * endpoint is for manual corrections (e.g. rejecting bad-faith
 * submissions, marking a deal cancelled before invoice).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { body = {} }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body?.status != null) {
    if (typeof body.status !== 'string' || !ALLOWED.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }
  if (body?.business_id !== undefined) {
    if (body.business_id !== null && typeof body.business_id !== 'string') {
      return NextResponse.json({ error: 'Invalid business_id' }, { status: 400 })
    }
    update.business_id = body.business_id
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('closes')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    logger.error('Close update failed', { id: params.id, error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, close: data })
}

/**
 * DELETE /api/admin/sales/closes/[id]
 *
 * Hard delete is only allowed if no commission rows are tied to
 * the close — otherwise we keep the row for audit. Use status =
 * 'cancelled' or 'rejected' for normal flow.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const { count } = await supabaseAdmin
    .from('commission_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('close_id', params.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Close has commission history — cancel it instead of deleting' },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin.from('closes').delete().eq('id', params.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
