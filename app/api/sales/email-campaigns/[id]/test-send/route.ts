import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

type RouteContext = { params: { id: string } }

// POST /api/sales/email-campaigns/[id]/test-send
// Sends a preview email to the rep's own address using dummy lead data.
// Does not create a lead record or count against daily cap.
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  if (!process.env.BREVO_API_KEY) {
    return NextResponse.json({ error: 'BREVO_API_KEY not configured' }, { status: 500 })
  }

  try {
    const { id: campaignId } = params

    const [campRes, userRes] = await Promise.all([
      supabaseAdmin
        .from('email_campaigns')
        .select('id, name, from_name, from_email, reply_to, subject, body_template, signature')
        .eq('id', campaignId)
        .eq('created_by', auth.userId)
        .single(),
      supabaseAdmin
        .from('custom_users')
        .select('email, first_name, last_name')
        .eq('id', auth.userId)
        .single(),
    ])

    if (campRes.error || !campRes.data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    if (userRes.error || !userRes.data?.email) {
      return NextResponse.json({ error: 'Could not determine your email' }, { status: 500 })
    }

    const campaign = campRes.data
    const repEmail = userRes.data.email

    // Fill template with obvious dummy values
    const dummyFirst = 'Jane'
    const dummyOwner = 'Jane Smith'
    const dummyBusiness = 'Acme Auto Repair'
    const dummyCity = 'Austin, TX'

    let body = campaign.body_template
      .replace(/\{\{first_name\}\}/g, dummyFirst)
      .replace(/\{\{owner_name\}\}/g, dummyOwner)
      .replace(/\{\{business_name\}\}/g, dummyBusiness)
      .replace(/\{\{city\}\}/g, dummyCity)
      .replace(/\{\{from_name\}\}/g, campaign.from_name)
      .replace(/\{\{unsubscribe_url\}\}/g, 'https://cloudgreet.com/unsubscribe/test-preview')

    const hasSignaturePlaceholder = body.includes('{{signature}}')
    body = body.replace(/\{\{signature\}\}/g, campaign.signature || '')
    if (!hasSignaturePlaceholder && campaign.signature) {
      body += `\n\n${campaign.signature}`
    }

    const subject = `[TEST] ${campaign.subject}`
      .replace(/\{\{first_name\}\}/g, dummyFirst)
      .replace(/\{\{business_name\}\}/g, dummyBusiness)

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: campaign.from_name, email: campaign.from_email },
        to: [{ email: repEmail }],
        replyTo: { email: campaign.reply_to || campaign.from_email },
        subject,
        textContent: body,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string }
      throw new Error(err.message || `Brevo error ${res.status}`)
    }

    logger.info('test send', { campaignId, to: repEmail })
    return NextResponse.json({ success: true, sentTo: repEmail })
  } catch (err) {
    logger.error('POST /test-send failed', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 })
  }
}
