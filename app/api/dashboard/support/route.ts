import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { postToSlack } from '@/lib/notifications/slack'
import { logImpersonatedAction } from '@/lib/compliance/logging'
import { notifyAdmin } from '@/lib/notifications/notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/dashboard/support
 *   body: { kind?: 'change_request' | 'message', subject: string, body: string }
 *
 * Contractor-side support submission. Persists to support_requests,
 * fires a Slack ping so the team sees it in real time. Mention list
 * (SLACK_AGENT_COMPLETE_MENTIONS) is reused so on-call gets pinged.
 *
 * The endpoint is auth-required (only signed-in clients/owners) -
 * no public form to spam.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    kind?: string
    subject?: string
    body?: string
  }

  const kind = body.kind === 'change_request' ? 'change_request' : 'message'
  const subject = (body.subject || '').trim()
  const message = (body.body || '').trim()

  if (!subject || subject.length > 200) {
    return NextResponse.json({ error: 'Subject is required (max 200 chars)' }, { status: 400 })
  }
  if (!message || message.length > 4000) {
    return NextResponse.json({ error: 'Message is required (max 4000 chars)' }, { status: 400 })
  }

  // Pull the business name + signed-in user's email for context in Slack.
  const [{ data: biz }, { data: user }] = await Promise.all([
    supabaseAdmin.from('businesses').select('business_name').eq('id', auth.businessId).maybeSingle(),
    supabaseAdmin.from('custom_users').select('email, name, first_name, last_name').eq('id', auth.userId!).maybeSingle(),
  ])

  const businessName = (biz as any)?.business_name || 'unknown business'
  const userName =
    (user as any)?.name
    || [(user as any)?.first_name, (user as any)?.last_name].filter(Boolean).join(' ').trim()
    || (user as any)?.email
    || 'unknown user'

  const { data: inserted, error } = await supabaseAdmin
    .from('support_requests')
    .insert({
      business_id: auth.businessId,
      user_id: auth.userId || null,
      kind,
      subject,
      body: message,
      status: 'open',
    })
    .select('id, created_at')
    .single()

  if (error || !inserted) {
    logger.error('support request insert failed', { error: error?.message })
    return NextResponse.json({
      error: 'Could not save request - run sql/support-requests.sql',
    }, { status: 500 })
  }

  // If admin filed this while impersonating, log both ids - support
  // tickets filed under a client account but actually authored by us
  // would otherwise be indistinguishable in the audit trail.
  await logImpersonatedAction({
    auth,
    action: 'support_request.create',
    path: '/api/dashboard/support',
    metadata: { kind, request_id: (inserted as any).id },
  })

  // In-app admin notification.
  void notifyAdmin({
    type: kind === 'change_request' ? 'support_change_request' : 'support_message',
    title: kind === 'change_request' ? `Change request from ${businessName}` : `Support message from ${businessName}`,
    body: subject,
    link: '/admin/support-requests',
    severity: kind === 'change_request' ? 'warning' : 'info',
    icon: 'wrench',
    metadata: {
      request_id: (inserted as any).id,
      business_id: auth.businessId,
      business_name: businessName,
      user_name: userName,
    },
  })

  // Best-effort Slack ping. Don't block the response on Slack outcome.
  void (async () => {
    const mentions = (process.env.SLACK_AGENT_COMPLETE_MENTIONS || '').trim()
    const prefix = mentions ? `${mentions} ` : ''
    const emoji = kind === 'change_request' ? ':wrench:' : ':speech_balloon:'
    const kindLabel = kind === 'change_request' ? 'Change request' : 'Support message'
    const truncatedBody = message.length > 600 ? message.slice(0, 600) + '…' : message
    await postToSlack({
      text: `${prefix}${emoji} *${kindLabel}* from *${businessName}* (${userName})\n*${subject}*\n\n${truncatedBody}\n\n_/admin/support-requests_`,
    })
  })()

  return NextResponse.json({
    success: true,
    id: (inserted as any).id,
    created_at: (inserted as any).created_at,
  })
}
