import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/conversations
 *
 * Text-to-book monitoring: every SMS conversation with its message counts,
 * last message, outcome, and the report_token for the read-only link.
 * Optional ?businessId= filter. Volume is small, so we pull recent
 * conversations + their messages and aggregate in memory.
 */
export async function GET(request: NextRequest) {
  const adminAuth = await requireAdmin(request)
  if (!adminAuth.success) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
  }

  try {
    const businessId = new URL(request.url).searchParams.get('businessId')

    let q = supabaseAdmin
      .from('sms_conversations')
      .select('id, business_id, customer_phone, report_token, created_at, updated_at, last_outbound_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(200)
    if (businessId) q = q.eq('business_id', businessId)
    const { data: convos, error } = await q
    if (error) {
      logger.error('admin conversations query failed', { error: error.message })
      return NextResponse.json({ error: 'query_failed' }, { status: 500 })
    }

    const rows = (convos || []) as any[]
    const convoIds = rows.map((r) => r.id)
    const bizIds = Array.from(new Set(rows.map((r) => r.business_id).filter(Boolean)))

    const [{ data: bizList }, { data: msgs }] = await Promise.all([
      bizIds.length
        ? supabaseAdmin.from('businesses').select('id, business_name').in('id', bizIds)
        : Promise.resolve({ data: [] as any[] }),
      convoIds.length
        ? supabaseAdmin
            .from('sms_agent_messages')
            .select('conversation_id, direction, body, created_at, tool_calls')
            .in('conversation_id', convoIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
    ])

    const bizName = new Map((bizList || []).map((b: any) => [b.id, b.business_name]))
    const byConvo = new Map<string, any[]>()
    for (const m of (msgs || []) as any[]) {
      const arr = byConvo.get(m.conversation_id) || []
      arr.push(m)
      byConvo.set(m.conversation_id, arr)
    }

    const conversations = rows.map((c) => {
      const ms = byConvo.get(c.id) || []
      const inbound = ms.filter((m) => m.direction === 'inbound').length
      const last = ms[ms.length - 1]
      let outcome: 'booked' | 'dispatch' | null = null
      for (const m of ms) {
        const tcs = Array.isArray(m.tool_calls) ? m.tool_calls : []
        for (const tc of tcs) {
          if (tc?.name === 'book_appointment' && tc?.result?.success === true) outcome = 'booked'
          else if (tc?.name === 'send_dispatch_request' && (tc?.result?.ok === true || tc?.result?.success === true)) {
            outcome = outcome || 'dispatch'
          }
        }
      }
      return {
        id: c.id,
        businessId: c.business_id,
        businessName: bizName.get(c.business_id) || 'Unknown',
        customerPhone: c.customer_phone,
        reportToken: c.report_token,
        messageCount: ms.length,
        inboundCount: inbound,
        lastMessage: last ? { direction: last.direction, body: last.body, at: last.created_at } : null,
        lastActivity: last?.created_at || c.updated_at || c.created_at,
        outcome,
        createdAt: c.created_at,
      }
    })

    return NextResponse.json({ conversations })
  } catch (e) {
    logger.error('admin conversations failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
