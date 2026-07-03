import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { listNotifications, markRead } from '@/lib/notifications/query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/notifications?unread=1&limit=50
 * PATCH /api/sales/notifications body: { ids: string[] } | { all: true }
 *
 * Reps see notifications addressed to their own user_id. Scope is
 * enforced server-side via the audience filter - reps can't peek at
 * other reps' notifications even if they pass another id.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get('unread') === '1'
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  try {
    const result = await listNotifications(
      { audience_type: 'rep', audience_id: auth.userId },
      { unreadOnly, limit },
    )
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'Failed',
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    ids?: string[]; all?: boolean
  }
  try {
    const r = await markRead(
      { audience_type: 'rep', audience_id: auth.userId },
      body,
    )
    return NextResponse.json({ success: true, ...r })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'Failed',
    }, { status: 500 })
  }
}
