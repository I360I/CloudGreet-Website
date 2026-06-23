import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const businessId = authResult.businessId

  try {
    const { data: convo, error: convoErr } = await supabaseAdmin
      .from('sms_conversations')
      .select('id, business_id, customer_phone, created_at')
      .eq('id', params.id)
      .eq('business_id', businessId)
      .maybeSingle()

    if (convoErr || !convo) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const { data: msgs, error: msgsErr } = await supabaseAdmin
      .from('sms_agent_messages')
      .select('id, direction, body, created_at, tool_calls')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true })

    if (msgsErr) {
      logger.error('dashboard conversations detail: msgs query failed', { id: params.id, error: msgsErr.message })
      return NextResponse.json({ error: 'query_failed' }, { status: 500 })
    }

    const phone = (convo as any).customer_phone as string
    const channel: 'sms' | 'web' = phone.startsWith('web-') ? 'web' : 'sms'

    const messages = ((msgs || []) as any[]).map((m) => ({
      id: m.id as string,
      direction: m.direction as string,
      body: m.body as string,
      createdAt: m.created_at as string,
      toolNames: Array.isArray(m.tool_calls)
        ? (m.tool_calls as any[]).map((t) => t?.name).filter(Boolean) as string[]
        : [],
    }))

    return NextResponse.json({
      conversation: {
        id: (convo as any).id,
        channel,
        customerPhone: phone,
        createdAt: (convo as any).created_at,
      },
      messages,
    })
  } catch (e) {
    logger.error('dashboard conversations detail failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
