import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { deleteRepNumber, setActiveRepNumber } from '@/lib/telnyx/rep-numbers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH - { active: true } to switch to this number
 * DELETE - release it from Telnyx and remove the row.
 *           Refuses if it's the active number (rep must switch first).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as { active?: boolean }
  if (body.active !== true) {
    return NextResponse.json({ error: 'Body must be { active: true }' }, { status: 400 })
  }
  const result = await setActiveRepNumber(auth.userId, params.id)
  if (result.ok !== true) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await deleteRepNumber(auth.userId, params.id)
  if (result.ok !== true) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}
