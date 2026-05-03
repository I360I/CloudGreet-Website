import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_STATUSES = ['cold', 'contacted', 'demo_booked', 'demo_done', 'closed_won', 'closed_lost'] as const
const VALID_SOURCES = ['cold_call', 'demo_line', 'referral', 'social', 'inbound_form', 'other'] as const

/* ------------------------------- GET ------------------------------- */

export async function GET(request: NextRequest) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: leads, error } = await supabaseAdmin
   .from('leads')
   .select('*')
   .order('created_at', { ascending: false })

  if (error) {
   logger.error('Admin leads list failed', { error: error.message })
   return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }

  // Counts by status, computed in one pass.
  const counts: Record<string, number> = {}
  for (const s of VALID_STATUSES) counts[s] = 0
  for (const l of leads || []) counts[l.status] = (counts[l.status] || 0) + 1

  return NextResponse.json({ success: true, leads: leads || [], counts })
 } catch (e) {
  logger.error('Admin leads GET failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
 }
}

/* ------------------------------- POST ------------------------------ */

export async function POST(request: NextRequest) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  // Bulk insert path — `bulk: true, leads: [...]` for CSV import.
  if (body.bulk && Array.isArray(body.leads)) {
   const sanitized = body.leads
    .map((l: any) => {
     const businessName = String(l.business_name || '').trim().slice(0, 200)
     return {
      // legacy NOT-NULL `name` column on leads — mirror from business_name.
      name: businessName,
      business_name: businessName,
      contact_name: l.contact_name ? String(l.contact_name).trim().slice(0, 200) : null,
      phone: l.phone ? String(l.phone).trim().slice(0, 50) : null,
      email: l.email ? String(l.email).trim().slice(0, 200) : null,
      source: VALID_SOURCES.includes(l.source) ? l.source : 'cold_call',
      status: VALID_STATUSES.includes(l.status) ? l.status : 'cold',
      notes: l.notes ? String(l.notes).slice(0, 2000) : null,
     }
    })
    .filter((l: any) => l.business_name)

   if (sanitized.length === 0) {
    return NextResponse.json({ error: 'No valid leads in payload' }, { status: 400 })
   }

   const { data: inserted, error } = await supabaseAdmin
    .from('leads').insert(sanitized).select('*')
   if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
   }
   return NextResponse.json({ success: true, inserted: inserted?.length ?? 0, leads: inserted })
  }

  // Single-record path
  const businessName = String(body.business_name || '').trim().slice(0, 200)
  const sanitized = {
   // legacy NOT-NULL `name` column on leads — mirror from business_name.
   name: businessName,
   business_name: businessName,
   contact_name: body.contact_name ? String(body.contact_name).trim().slice(0, 200) : null,
   phone: body.phone ? String(body.phone).trim().slice(0, 50) : null,
   email: body.email ? String(body.email).trim().slice(0, 200) : null,
   source: VALID_SOURCES.includes(body.source) ? body.source : 'cold_call',
   status: VALID_STATUSES.includes(body.status) ? body.status : 'cold',
   notes: body.notes ? String(body.notes).slice(0, 2000) : null,
   last_contacted_at: body.last_contacted_at || null,
   next_action_at: body.next_action_at || null,
  }

  if (!sanitized.business_name) {
   return NextResponse.json({ error: 'business_name is required' }, { status: 400 })
  }

  const { data: lead, error } = await supabaseAdmin
   .from('leads').insert(sanitized).select('*').single()

  if (error) {
   return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, lead })
 } catch (e) {
  logger.error('Admin leads POST failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
 }
}
