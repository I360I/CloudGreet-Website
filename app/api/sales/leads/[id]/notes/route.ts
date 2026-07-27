import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leads/[id]/notes
 *
 * The lead's full note history, newest first. Notes are shared across
 * whoever has worked the lead (a rep picking up a setter's lead sees
 * the setter's call notes), with the author's name on each so the
 * timeline reads like a handoff log.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
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

  const { data: notes, error } = await supabaseAdmin
    .from('lead_notes')
    .select('id, body, created_at, rep_id')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach author names so shared threads read clearly.
  const repIds = Array.from(new Set((notes || []).map((n: any) => n.rep_id).filter(Boolean)))
  const names = new Map<string, string>()
  if (repIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from('custom_users')
      .select('id, first_name, last_name')
      .in('id', repIds)
    for (const u of users || []) {
      names.set(u.id, [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Rep')
    }
  }

  return NextResponse.json({
    success: true,
    notes: (notes || []).map((n: any) => ({
      id: n.id,
      body: n.body,
      created_at: n.created_at,
      author: names.get(n.rep_id) || 'Rep',
      mine: n.rep_id === auth.userId,
    })),
  })
}

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
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
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
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
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
