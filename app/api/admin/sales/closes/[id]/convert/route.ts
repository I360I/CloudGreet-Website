import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { convertCloseToClient } from '@/lib/sales/convert-close'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/sales/closes/[id]/convert
 *   { email?, password?, first_name?, last_name?, business_type? }
 *
 * Promotes a close into a real client. Wraps the shared
 * lib/sales/convert-close helper so the same logic powers both
 * this admin path and the rep self-serve checkout webhook.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const result = await convertCloseToClient({
    closeId: params.id,
    email: body?.email,
    password: body?.password,
    first_name: body?.first_name,
    last_name: body?.last_name,
    business_type: body?.business_type,
  })

  if (result.ok === false) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    business: result.data.business,
    user: result.data.user,
    temp_password: result.data.temp_password,
  })
}
