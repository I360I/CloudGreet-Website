import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const patch: Record<string, any> = {}

  if (body.venue_name !== undefined) patch.venue_name = String(body.venue_name).trim()
  if (body.canonical_address !== undefined) patch.canonical_address = String(body.canonical_address).trim() || null
  if (body.category !== undefined) {
    const cat = String(body.category).toLowerCase()
    if (!['standard', 'major', 'premium'].includes(cat)) {
      return NextResponse.json({ error: 'category must be standard, major, or premium' }, { status: 400 })
    }
    patch.category = cat
  }
  if (body.fee_dollars !== undefined) {
    const fee = Number(body.fee_dollars)
    if (!Number.isFinite(fee) || fee < 0) {
      return NextResponse.json({ error: 'fee_dollars must be a non-negative number' }, { status: 400 })
    }
    patch.fee_dollars = fee
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('venue_fees')
    .update(patch)
    .eq('id', params.id)
    .eq('business_id', auth.businessId)
    .select('id, venue_name, canonical_address, category, fee_dollars')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ venue: data })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('venue_fees')
    .delete()
    .eq('id', params.id)
    .eq('business_id', auth.businessId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
