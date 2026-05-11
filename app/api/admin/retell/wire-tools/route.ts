import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { retellAgentManager } from '@/lib/retell-agent-manager'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/retell/wire-tools
 *   body: { businessId: string }
 *
 * Attaches the three webhook-backed tools (book_appointment,
 * send_booking_sms, lookup_availability) to an existing Retell agent's
 * LLM, then re-publishes + re-binds phones. Used to retrofit agents
 * created before tools were wired programmatically.
 *
 * Idempotent: Retell replaces general_tools wholesale on PATCH.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { businessId?: string }
  const businessId = (body.businessId || '').trim()
  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  }

  try {
    const trace = await retellAgentManager().ensureLLMToolsForBusiness(businessId)
    return NextResponse.json({ success: true, trace })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    logger.error('wire-tools failed', { businessId, error: msg })
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
