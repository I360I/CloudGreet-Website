import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAGE_SIZE = 25

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const businessId = authResult.businessId

  try {
    // Gate: only businesses with an SMS number provisioned can access conversations.
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('sms_phone_number, sms_agent_enabled')
      .eq('id', businessId)
      .maybeSingle()

    if (!biz || !((biz as any).sms_phone_number)) {
      return NextResponse.json({ conversations: [], total: 0, feature_enabled: false })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { data: convos, error, count } = await supabaseAdmin
      .from('sms_conversations')
      .select('id, customer_phone, report_token, created_at, updated_at, last_outbound_at', { count: 'exact' })
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('dashboard conversations list failed', { businessId, error: error.message })
      return NextResponse.json({ error: 'query_failed' }, { status: 500 })
    }

    const rows = (convos || []) as any[]
    const convoIds = rows.map((r) => r.id)

    const { data: msgs } = convoIds.length
      ? await supabaseAdmin
          .from('sms_agent_messages')
          .select('conversation_id, direction, body, created_at, tool_calls')
          .in('conversation_id', convoIds)
          .order('created_at', { ascending: true })
      : { data: [] as any[] }

    const byConvo = new Map<string, any[]>()
    for (const m of (msgs || []) as any[]) {
      const arr = byConvo.get(m.conversation_id) || []
      arr.push(m)
      byConvo.set(m.conversation_id, arr)
    }

    const conversations = rows.map((c) => {
      const ms = byConvo.get(c.id) || []
      const last = ms[ms.length - 1] || null

      let outcome: 'booked' | 'dispatch' | null = null
      let customerName: string | null = null
      for (const m of ms) {
        const tcs = Array.isArray(m.tool_calls) ? m.tool_calls : []
        for (const tc of tcs) {
          if (tc?.name === 'book_appointment' && tc?.result?.success === true) outcome = 'booked'
          else if (tc?.name === 'send_dispatch_request' && (tc?.result?.ok === true || tc?.result?.success === true)) {
            outcome = outcome || 'dispatch'
          }
          if (!customerName && (tc?.name === 'book_appointment' || tc?.name === 'send_dispatch_request') && tc?.args?.customer_name) {
            customerName = String(tc.args.customer_name)
          }
        }
      }

      const phone = (c.customer_phone as string) || ''
      const channel: 'sms' | 'web' = phone.startsWith('web-') ? 'web' : 'sms'

      return {
        id: c.id,
        channel,
        customerPhone: phone,
        customerName,
        messageCount: ms.length,
        lastMessage: last ? { direction: last.direction as string, body: last.body as string, at: last.created_at as string } : null,
        lastActivity: last?.created_at || c.updated_at || c.created_at,
        outcome,
        createdAt: c.created_at,
      }
    })

    return NextResponse.json({ conversations, total: count ?? rows.length, feature_enabled: true })
  } catch (e) {
    logger.error('dashboard conversations failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
