import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { provisionRepNumber } from '@/lib/telnyx/provision-number'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/sales/reps/[id]/provision-number
 *   body (optional): { area_code?: string, force?: boolean }
 *
 * Manually provision (or re-provision with force=true) a Telnyx DID
 * for a rep. Used when accept-invite's auto-provision failed - admin
 * can retry from the rep's profile page without code changes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { area_code?: string; force?: boolean }
  const result = await provisionRepNumber(params.id, {
    areaCode: body.area_code?.trim() || undefined,
    force: body.force === true,
  })

  if (result.ok !== true) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({
    success: true,
    phone_number: result.phone_number,
    phone_id: result.phone_id,
    reused: result.reused === true,
  })
}
