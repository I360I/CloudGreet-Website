import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('venue_fees')
    .select('id, venue_name, canonical_address, category, fee_dollars')
    .eq('business_id', auth.businessId)
    .order('fee_dollars', { ascending: false })
    .order('venue_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ venues: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const venue_name = String(body.venue_name || '').trim()
  const canonical_address = String(body.canonical_address || '').trim()
  const category = String(body.category || 'standard').toLowerCase()
  const fee_dollars = Number(body.fee_dollars)

  if (!venue_name) return NextResponse.json({ error: 'venue_name is required' }, { status: 400 })
  if (!['standard', 'major', 'premium'].includes(category)) {
    return NextResponse.json({ error: 'category must be standard, major, or premium' }, { status: 400 })
  }
  if (!Number.isFinite(fee_dollars) || fee_dollars < 0) {
    return NextResponse.json({ error: 'fee_dollars must be a non-negative number' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('venue_fees')
    .insert({ business_id: auth.businessId, venue_name, canonical_address: canonical_address || null, category, fee_dollars })
    .select('id, venue_name, canonical_address, category, fee_dollars')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ venue: data })
}
