import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { isComplete } from '@/lib/customization/form-config'
import { postToSlack, fieldsBlock } from '@/lib/notifications/slack'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/customize/submit
 *   body: { answers: Record<fieldId, any> }
 *
 * Final submit. Validates required fields, replaces the saved blob,
 * and flips customization_status to 'submitted' + stamps submitted_at.
 * The admin then takes over from /admin/agents-due.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { answers?: Record<string, any> }
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : null
  if (!answers) return NextResponse.json({ error: 'answers required' }, { status: 400 })

  if (!isComplete(answers)) {
    return NextResponse.json({
      error: 'Some required fields are still empty - scroll up and finish them.',
    }, { status: 400 })
  }

  try {
    const nowIso = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('businesses')
      .update({
        customization: answers,
        customization_status: 'submitted',
        customization_submitted_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', auth.businessId)
    if (error) {
      return NextResponse.json({
        error: 'Could not submit - run sql/customization-and-demo-agents.sql',
      }, { status: 500 })
    }

    // Best-effort Slack ping so the founder knows there's a new build
    // sitting in the queue. Pulled lazily so a missing webhook doesn't
    // ever block the success response.
    void (async () => {
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('business_name')
        .eq('id', auth.businessId)
        .maybeSingle()
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
      await postToSlack({
        text: `:incoming_envelope: Customization form submitted - ${biz?.business_name || 'a client'}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Customization form submitted*\n${biz?.business_name || 'A client'} just submitted their agent build form.` },
          },
          fieldsBlock([
            { label: 'Business', value: biz?.business_name || null },
            { label: 'Submitted', value: new Date(nowIso).toLocaleString() },
          ]),
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Open in admin' },
                url: `${baseUrl}/admin/agents-due`,
              },
            ],
          },
        ],
      })
    })()

    return NextResponse.json({ success: true, submitted_at: nowIso })
  } catch (e) {
    logger.error('customize submit failed', {
      businessId: auth.businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
