import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/notes  { body: string }
 *
 * Add a timestamped note to a lead's thread (rep's own notes -
 * other reps don't see them). Authorization: caller must own the
 * lead_assignment.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) {
    return NextResponse.json({ error: 'Not your lead' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({} as any))
  const text = (body?.body ?? '').toString().trim().slice(0, 4000)
  if (!text) {
    return NextResponse.json({ error: 'Empty note' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('lead_notes')
    .insert({ lead_id: params.id, rep_id: auth.userId, body: text })
    .select('id, body, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, note: data })
}

/**
 * DELETE /api/sales/leads/[id]/notes?note_id=...
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const noteId = new URL(request.url).searchParams.get('note_id')
  if (!noteId) return NextResponse.json({ error: 'note_id required' }, { status: 400 })
  const { error } = await supabaseAdmin
    .from('lead_notes')
    .delete()
    .eq('id', noteId)
    .eq('lead_id', params.id)
    .eq('rep_id', auth.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
