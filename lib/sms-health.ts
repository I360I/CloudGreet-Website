import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

const STEVE_BUSINESS_ID = '650406c3-5585-446e-958d-0fbcccf54795'

export type HealthIssue = {
  severity: 'warning' | 'critical'
  type: 'dropped_conversation' | 'failed_booking' | 'failed_dispatch' | 'no_response' | 'review_failed'
  customerPhone: string
  businessName: string
  conversationId: string
  detail: string
}

export type SmsHealthReport = {
  generatedAt: string
  windowHours: number
  totalConversations: number
  totalMessages: number
  bookings: number
  dispatches: number
  reviewRequestsFailed: number
  issues: HealthIssue[]
  aiSummary: string
  healthy: boolean
}

export async function runSmsHealthCheck(opts?: {
  windowHours?: number
  businessId?: string
}): Promise<SmsHealthReport> {
  const windowHours = opts?.windowHours ?? 24
  const businessId = opts?.businessId ?? null
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()

  let convosQ = supabaseAdmin
    .from('sms_conversations')
    .select('id, business_id, customer_phone, created_at, updated_at')
    .gte('updated_at', since)
  if (businessId) convosQ = convosQ.eq('business_id', businessId)
  const { data: convos } = await convosQ

  const rows = (convos || []) as any[]
  if (rows.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      windowHours,
      totalConversations: 0,
      totalMessages: 0,
      bookings: 0,
      dispatches: 0,
      reviewRequestsFailed: 0,
      issues: [],
      aiSummary: `No SMS conversations in the last ${windowHours} hours.`,
      healthy: true,
    }
  }

  const bizIds = Array.from(new Set(rows.map((r: any) => r.business_id).filter(Boolean)))
  const convoIds = rows.map((r: any) => r.id)

  const [{ data: bizList }, { data: msgs }, { data: failedReviews }] = await Promise.all([
    supabaseAdmin.from('businesses').select('id, business_name').in('id', bizIds),
    supabaseAdmin
      .from('sms_agent_messages')
      .select('conversation_id, direction, body, created_at, tool_calls')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('review_requests')
      .select('id, business_id, customer_phone, failure_reason')
      .eq('status', 'failed')
      .gte('updated_at', since),
  ])

  const bizName = new Map((bizList || []).map((b: any) => [b.id, b.business_name]))
  const byConvo = new Map<string, any[]>()
  for (const m of (msgs || []) as any[]) {
    const arr = byConvo.get(m.conversation_id) || []
    arr.push(m)
    byConvo.set(m.conversation_id, arr)
  }

  const issues: HealthIssue[] = []
  let bookings = 0
  let dispatches = 0
  let totalMessages = 0

  for (const c of rows) {
    const ms = byConvo.get(c.id) || []
    totalMessages += ms.length
    const business = bizName.get(c.business_id) || 'Unknown'
    const phone = c.customer_phone as string

    // No outbound response at all
    const hasOutbound = ms.some((m: any) => m.direction === 'outbound')
    const hasInbound = ms.some((m: any) => m.direction === 'inbound')
    if (hasInbound && !hasOutbound) {
      issues.push({
        severity: 'critical',
        type: 'no_response',
        customerPhone: phone,
        businessName: business,
        conversationId: c.id,
        detail: 'Inbound message(s) received but agent never responded.',
      })
    }

    // Dropped: last message is inbound and it's been >10 minutes
    if (ms.length > 0) {
      const last = ms[ms.length - 1]
      const ageMin = (Date.now() - new Date(last.created_at).getTime()) / 60000
      if (last.direction === 'inbound' && ageMin > 10) {
        issues.push({
          severity: 'warning',
          type: 'dropped_conversation',
          customerPhone: phone,
          businessName: business,
          conversationId: c.id,
          detail: `Last message from customer ${Math.round(ageMin)} min ago with no agent reply.`,
        })
      }
    }

    // Scan tool calls for failures
    for (const m of ms) {
      const tcs = Array.isArray(m.tool_calls) ? m.tool_calls : []
      for (const tc of tcs) {
        if (tc?.name === 'book_appointment') {
          if (tc?.result?.success === true) {
            bookings++
          } else if (tc?.result?.success === false) {
            issues.push({
              severity: 'critical',
              type: 'failed_booking',
              customerPhone: phone,
              businessName: business,
              conversationId: c.id,
              detail: tc?.result?.error || 'book_appointment returned success:false',
            })
          }
        }
        if (tc?.name === 'send_dispatch_request') {
          if (tc?.result?.ok === true || tc?.result?.success === true) {
            dispatches++
          } else if (tc?.result?.ok === false || tc?.result?.success === false) {
            const errCode = tc?.result?.error
            // These are guards working as designed, not real failures -- skip them
            if (errCode === 'already_dispatched_in_conversation' || errCode === 'dispatch_cap_exceeded' || errCode === 'already_booked_in_conversation') {
              continue
            }
            issues.push({
              severity: 'critical',
              type: 'failed_dispatch',
              customerPhone: phone,
              businessName: business,
              conversationId: c.id,
              detail: errCode || 'send_dispatch_request returned ok:false',
            })
          }
        }
      }
    }
  }

  const reviewRequestsFailed = ((failedReviews || []) as any[]).length
  for (const r of (failedReviews || []) as any[]) {
    issues.push({
      severity: 'warning',
      type: 'review_failed',
      customerPhone: r.customer_phone || '',
      businessName: bizName.get(r.business_id) || 'Unknown',
      conversationId: '',
      detail: r.failure_reason || 'Review SMS failed to send.',
    })
  }

  const aiSummary = await generateAiSummary({
    windowHours,
    totalConversations: rows.length,
    totalMessages,
    bookings,
    dispatches,
    reviewRequestsFailed,
    issues,
    businessId: businessId ?? 'all',
  })

  return {
    generatedAt: new Date().toISOString(),
    windowHours,
    totalConversations: rows.length,
    totalMessages,
    bookings,
    dispatches,
    reviewRequestsFailed,
    issues,
    aiSummary,
    healthy: issues.filter((i) => i.severity === 'critical').length === 0,
  }
}

async function generateAiSummary(data: {
  windowHours: number
  totalConversations: number
  totalMessages: number
  bookings: number
  dispatches: number
  reviewRequestsFailed: number
  issues: HealthIssue[]
  businessId: string
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return `${data.totalConversations} conversations, ${data.bookings} booked, ${data.dispatches} dispatched. ${data.issues.length} issue(s) flagged.`

  try {
    const client = new Anthropic({ apiKey })
    const issueLines = data.issues.length
      ? data.issues.map((i) => `- [${i.severity.toUpperCase()}] ${i.type}: ${i.detail} (${i.customerPhone || 'N/A'} @ ${i.businessName})`).join('\n')
      : 'None.'

    const prompt = `You are a CloudGreet SMS operations monitor. Write a 2-3 sentence plain-English health summary for the founder. Be direct and specific. Flag critical issues clearly. Do not use em dashes.

Data for last ${data.windowHours} hours:
- Conversations: ${data.totalConversations}
- Messages: ${data.totalMessages}
- Bookings completed: ${data.bookings}
- Dispatches sent: ${data.dispatches}
- Review SMS failures: ${data.reviewRequestsFailed}
- Issues flagged:
${issueLines}

Write the summary now:`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    return (msg.content[0] as any)?.text?.trim() || 'Summary unavailable.'
  } catch (e) {
    logger.warn('sms health: AI summary failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return `${data.totalConversations} conversations, ${data.bookings} booked, ${data.dispatches} dispatched. ${data.issues.length} issue(s) flagged.`
  }
}
