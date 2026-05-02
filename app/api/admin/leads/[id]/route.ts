import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_STATUSES = ['cold', 'contacted', 'demo_booked', 'demo_done', 'closed_won', 'closed_lost']
const VALID_SOURCES = ['cold_call', 'demo_line', 'referral', 'social', 'inbound_form', 'other']

const ALLOWED: Record<string, true> = {
 business_name: true, contact_name: true, phone: true, email: true,
 source: true, status: true, notes: true,
 last_contacted_at: true, next_action_at: true,
 assigned_business_id: true,
}

export async function PATCH(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const update: Record<string, any> = {}
  for (const k of Object.keys(body)) {
   if (!ALLOWED[k]) continue
   update[k] = body[k]
  }
  if (update.status && !VALID_STATUSES.includes(update.status)) {
   return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (update.source && !VALID_SOURCES.includes(update.source)) {
   return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }
  if (Object.keys(update).length === 0) {
   return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  // Auto-stamp last_contacted_at when transitioning to "contacted".
  if (update.status === 'contacted' && !update.last_contacted_at) {
   update.last_contacted_at = new Date().toISOString()
  }

  const { data: lead, error } = await supabaseAdmin
   .from('leads').update(update).eq('id', params.id).select('*').single()

  if (error) {
   return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, lead })
 } catch (e) {
  logger.error('Admin lead PATCH failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
 }
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin.from('leads').delete().eq('id', params.id)
  if (error) {
   return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
 } catch (e) {
  return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
 }
}
