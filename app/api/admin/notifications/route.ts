import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { listNotifications, markRead } from '@/lib/notifications/query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/notifications?unread=1&limit=50
 * PATCH /api/admin/notifications  body: { ids: string[] } | { all: true }
 *
 * Admin sees every notification with audience='admin'. The bell in the
 * admin shell hits this on mount + on a 30s interval.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get('unread') === '1'
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  try {
    const result = await listNotifications({ audience_type: 'admin' }, { unreadOnly, limit })
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'Failed',
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    ids?: string[]; all?: boolean
  }
  try {
    const r = await markRead({ audience_type: 'admin' }, body)
    return NextResponse.json({ success: true, ...r })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'Failed',
    }, { status: 500 })
  }
}
