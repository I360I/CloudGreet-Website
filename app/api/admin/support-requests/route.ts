import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/support-requests
 *   ?status=open|in_progress|resolved|wontfix|all (default: open + in_progress)
 *
 * Returns the support queue with the originating business + user
 * names denormalized so the admin list renders fast.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wantedStatus = new URL(request.url).searchParams.get('status') || 'open_or_in_progress'

  let query = supabaseAdmin
    .from('support_requests')
    .select('id, business_id, user_id, kind, subject, body, status, admin_notes, resolved_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (wantedStatus === 'all') {
    // no filter
  } else if (wantedStatus === 'open_or_in_progress') {
    query = query.in('status', ['open', 'in_progress'])
  } else {
    query = query.eq('status', wantedStatus)
  }

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const businessIds = Array.from(new Set((rows || []).map((r: any) => r.business_id).filter(Boolean)))
  const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id).filter(Boolean)))

  const [{ data: businesses }, { data: users }] = await Promise.all([
    businessIds.length > 0
      ? supabaseAdmin.from('businesses').select('id, business_name').in('id', businessIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length > 0
      ? supabaseAdmin.from('custom_users').select('id, email, name, first_name, last_name').in('id', userIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const bizMap = new Map<string, string>()
  for (const b of businesses || []) bizMap.set((b as any).id, (b as any).business_name)
  const userMap = new Map<string, { name: string; email: string }>()
  for (const u of users || []) {
    const x = u as any
    userMap.set(x.id, {
      name: x.name || [x.first_name, x.last_name].filter(Boolean).join(' ').trim() || x.email,
      email: x.email,
    })
  }

  const items = (rows || []).map((r: any) => ({
    ...r,
    business_name: bizMap.get(r.business_id) || null,
    user: userMap.get(r.user_id) || null,
  }))

  return NextResponse.json({ success: true, items })
}

/**
 * PATCH /api/admin/support-requests
 *   body: { id: string, status?: ..., admin_notes?: string }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    id?: string; status?: string; admin_notes?: string
  }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.status) {
    if (!['open', 'in_progress', 'resolved', 'wontfix'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    update.status = body.status
    if (body.status === 'resolved' || body.status === 'wontfix') {
      update.resolved_at = new Date().toISOString()
    }
  }
  if (typeof body.admin_notes === 'string') {
    update.admin_notes = body.admin_notes.trim() || null
  }

  const { error } = await supabaseAdmin
    .from('support_requests')
    .update(update)
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
