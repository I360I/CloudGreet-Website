import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/scrape/request-more  { reason?: string }
 *
 * Pings the founder when a rep wants their daily scrape cap raised.
 * Best-effort email — we don't persist the request, just send the
 * note. If Resend isn't configured the endpoint still returns 200 so
 * the UI can show a confirmation; logs warn server-side.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const reason = body?.reason ? String(body.reason).trim().slice(0, 1000) : ''

  const { data: rep } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, name')
    .eq('id', auth.userId)
    .maybeSingle()
  const { data: profile } = await supabaseAdmin
    .from('sales_reps')
    .select('lead_scrape_limit')
    .eq('id', auth.userId)
    .maybeSingle()

  const repName = rep?.name || [rep?.first_name, rep?.last_name].filter(Boolean).join(' ') || rep?.email || 'A rep'
  const currentLimit = profile?.lead_scrape_limit ?? 200

  const resendKey = process.env.RESEND_API_KEY
  const founderEmail = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'

  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: founderEmail,
        replyTo: rep?.email || undefined,
        subject: `${repName} hit their daily scrape cap`,
        text:
`${repName} just hit their daily lead-scrape cap (${currentLimit}/day) and is asking for more.

${reason ? `Note from ${repName}:\n${reason}\n\n` : ''}Raise their cap in admin: ${baseUrl}/admin/sales/${auth.userId}
`,
      })
    } catch (e) {
      logger.warn('Request-more email failed', {
        userId: auth.userId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  } else {
    logger.warn('Request-more: RESEND_API_KEY not configured', { userId: auth.userId })
  }

  return NextResponse.json({ success: true })
}
