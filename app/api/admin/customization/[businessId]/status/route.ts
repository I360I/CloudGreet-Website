import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { postToSlack } from '@/lib/notifications/slack'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/customization/[businessId]/status
 *   body: { status: 'building' | 'ready' | 'live' | 'submitted' }
 *
 * Admin moves a business through the customization pipeline after
 * the client has submitted the form. The rep + admin views read the
 * latest status off businesses.customization_status.
 *
 * Side effects on 'ready':
 *   · stamp customization_ready_at
 *   · email the client a "your agent is ready - schedule the go-live call"
 *     prompt, using their on-file owner email
 *   · slack ping
 */
const VALID_STATUSES = ['submitted', 'building', 'ready', 'live'] as const
type Status = typeof VALID_STATUSES[number]

export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { status?: string }
  const status = String(body.status || '') as Status
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(' / ')}` }, { status: 400 })
  }

  try {
    const nowIso = new Date().toISOString()
    const update: Record<string, any> = {
      customization_status: status,
      updated_at: nowIso,
    }
    if (status === 'ready') update.customization_ready_at = nowIso

    const { error } = await supabaseAdmin
      .from('businesses')
      .update(update)
      .eq('id', params.businessId)
    if (error) {
      return NextResponse.json({
        error: 'Could not save - run sql/customization-and-demo-agents.sql',
      }, { status: 500 })
    }

    // Side effects on 'ready' - go-live email + slack.
    if (status === 'ready') {
      void sendGoLiveEmail(params.businessId).catch(() => { /* logged inside */ })
    }
    void postToSlack({
      text: `:gear: Customization → *${status}* · business ${params.businessId}`,
    })

    return NextResponse.json({ success: true, status })
  } catch (e) {
    logger.error('admin customization status failed', {
      businessId: params.businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

async function sendGoLiveEmail(businessId: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    logger.warn('go-live email skipped - no RESEND_API_KEY', { businessId })
    return
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name')
    .eq('id', businessId)
    .maybeSingle()
  if (!biz) return

  const { data: owner } = await supabaseAdmin
    .from('custom_users')
    .select('email, first_name, name')
    .eq('business_id', businessId)
    .eq('role', 'owner')
    .maybeSingle()
  const to = (owner as any)?.email
  if (!to) {
    logger.warn('go-live email skipped - no owner email on file', { businessId })
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const dashUrl = `${baseUrl}/dashboard`
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
  const replyTo = process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'

  const greet = (owner as any)?.first_name ? `Hi ${(owner as any).first_name},` : 'Hi,'
  const text = [
    greet,
    '',
    `Your CloudGreet agent for ${(biz as any).business_name || 'your business'} is ready.`,
    '',
    `Sign in: ${dashUrl}`,
    '',
    'Reply to this email with a 30-min slot that works and we\'ll do the go-live call - we\'ll walk through the agent live, make any final tweaks, then activate it on your real number.',
    '',
    '- CloudGreet',
  ].join('\n')

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Your agent is ready.</div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;font-size:14px;line-height:1.6;color:#374151;">
          ${greet} your CloudGreet agent for <strong>${escapeHtml((biz as any).business_name || 'your business')}</strong> is ready for a final review.
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <a href="${dashUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;padding:10px 18px;font-weight:500;">Open dashboard</a>
        </td></tr>
        <tr><td style="padding:24px 32px 0;font-size:13px;line-height:1.6;color:#4b5563;">
          Reply with a 30-min slot that works and we'll do the go-live call together - we'll walk through the agent, make final tweaks, and flip it on for your real business number.
        </td></tr>
        <tr><td style="padding:28px 32px 32px;">
          <div style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
            CloudGreet · AI receptionist for service businesses
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  try {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: `CloudGreet <${fromEmail}>`,
      to,
      replyTo,
      subject: `Your CloudGreet agent is ready · ${(biz as any).business_name || 'go-live'}`,
      text,
      html,
    })
  } catch (e) {
    logger.warn('go-live email send failed', {
      businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
