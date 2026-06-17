import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/agents-due/new-client
 *   { business_name, contact_name?, phone?, email?, website? }
 *
 * Spin up a fresh close so an admin can build a prompt for a brand-new
 * business straight from Agents Due (no rep, no lead needed). We stamp
 * demo_scheduled_at = now so it surfaces in the active build queue, and
 * the admin lands in its workspace where the prompt generator lives.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const name = String(body?.business_name || '').trim()
  if (!name) return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })

  const str = (v: any, max: number) => (v ? String(v).trim().slice(0, max) : null)

  const row = {
    rep_id: auth.userId, // the admin owns this internal close
    prospect_business_name: name.slice(0, 200),
    prospect_contact_name: str(body?.contact_name, 200),
    prospect_phone: str(body?.phone, 40),
    prospect_email: body?.email ? String(body.email).trim().toLowerCase().slice(0, 200) : null,
    website: str(body?.website, 300),
    agreed_monthly_cents: 0,
    agreed_setup_fee_cents: 0,
    status: 'pending',
    demo_scheduled_at: new Date().toISOString(), // "due now" -> shows in the queue
    notes: 'Created from Agents Due (manual prompt-generator client)',
  }

  const { data, error } = await supabaseAdmin.from('closes').insert(row).select('id').single()
  if (error || !data) {
    logger.error('new-client: insert failed', { error: error?.message })
    return NextResponse.json({ error: error?.message || 'Could not create client' }, { status: 500 })
  }

  logger.info('Agents Due: new manual client created', { closeId: data.id, business: name })
  return NextResponse.json({ success: true, close_id: data.id })
}
