import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/mark-demo
 *   body: { scheduled_at: ISO datetime, notes?: string }
 *
 * Marks the lead as demo_scheduled, stamps the demo time on the
 * rep's lead_assignment row, and fires two notifications:
 *   1. Founder email (Anthony) via emailFounderAlert
 *   2. Slack post if SLACK_WEBHOOK_URL is configured
 *
 * Rep can only mark leads assigned to them.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const scheduledAtRaw = String(body?.scheduled_at || '').trim()
  if (!scheduledAtRaw) {
    return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 })
  }
  const scheduledAt = new Date(scheduledAtRaw)
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'scheduled_at is not a valid date' }, { status: 400 })
  }
  const notes = String(body?.notes || '').trim().slice(0, 500) || null

  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) {
    return NextResponse.json({ error: 'Not your lead' }, { status: 404 })
  }

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, contact_name, phone, email')
    .eq('id', params.id)
    .maybeSingle()
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const scheduledAtIso = scheduledAt.toISOString()
  const { error: updErr } = await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'demo_scheduled',
      follow_up_at: scheduledAtIso,
      last_touched_at: new Date().toISOString(),
    })
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
  if (updErr) {
    logger.error('mark-demo: assignment update failed', { leadId: params.id, error: updErr.message })
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Pull rep info for the notification.
  const { data: rep } = await supabaseAdmin
    .from('custom_users')
    .select('email, name, first_name, last_name')
    .eq('id', auth.userId)
    .maybeSingle()
  const repName = rep?.name
    || [rep?.first_name, rep?.last_name].filter(Boolean).join(' ')
    || rep?.email
    || 'a rep'

  // Pretty when-string in the founder's local TZ (best effort).
  const whenPretty = scheduledAt.toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })

  // 1. Founder email (best-effort, fire-and-forget).
  void (async () => {
    try {
      const { emailFounderAlert } = await import('@/lib/notifications/founder-alert')
      await emailFounderAlert({
        subject: `Demo set: ${lead.business_name} (${repName})`,
        body: `${repName} just scheduled a demo with ${lead.business_name}.\n\nWhen: ${whenPretty}\n${notes ? `Notes: ${notes}\n` : ''}\nContact: ${lead.contact_name || '-'}\nPhone: ${lead.phone || '-'}\nEmail: ${lead.email || '-'}`,
        replyTo: rep?.email || undefined,
        metadata: {
          lead_id: lead.id,
          business_name: lead.business_name,
          contact_name: lead.contact_name,
          phone: lead.phone,
          email: lead.email,
          rep: repName,
          rep_email: rep?.email,
          scheduled_at: scheduledAtIso,
        },
      })
    } catch (e) {
      logger.warn('mark-demo: founder email failed', {
        leadId: lead.id, error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  })()

  // 2. Slack post (best-effort).
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  if (slackUrl) {
    void (async () => {
      try {
        const text = `:calendar: *Demo set* by ${repName} with *${lead.business_name}*\n` +
          `When: ${whenPretty}\n` +
          (lead.contact_name ? `Contact: ${lead.contact_name}\n` : '') +
          (lead.phone ? `Phone: ${lead.phone}\n` : '') +
          (lead.email ? `Email: ${lead.email}\n` : '') +
          (notes ? `Notes: ${notes}` : '')
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
      } catch (e) {
        logger.warn('mark-demo: slack post failed', {
          leadId: lead.id, error: e instanceof Error ? e.message : 'Unknown',
        })
      }
    })()
  }

  logger.info('Rep marked demo set', {
    repId: auth.userId, leadId: lead.id, scheduledAt: scheduledAtIso,
  })

  return NextResponse.json({
    success: true,
    lead_id: lead.id,
    scheduled_at: scheduledAtIso,
    slack_configured: !!slackUrl,
  })
}
