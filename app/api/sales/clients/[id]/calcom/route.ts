import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import {
  validateConnection, registerOrAdoptWebhook, deleteWebhook,
  listEventTypesDetailed, getMe, CalcomError,
} from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Rep-side Cal.com connect. Same logic as the contractor's
 * /api/onboarding/calcom but auths the rep via businesses.rep_id
 * so they can wire it up live during the demo without waiting on
 * an admin to do it for them.
 *
 * POST   { apiKey, eventTypeId? }   - connect or list event types
 * DELETE                            - disconnect
 *
 * If `eventTypeId` is missing or invalid, returns the list so the UI
 * can render a dropdown.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ success: false, error: 'Sales role required' }, { status: 401 })
  }

  const { data: ownership } = await supabaseAdmin
    .from('businesses')
    .select('id, rep_id, cal_com_api_key, cal_com_webhook_id')
    .eq('id', params.id)
    .eq('rep_id', auth.userId)
    .maybeSingle()
  if (!ownership) {
    return NextResponse.json({ success: false, error: 'Not your client' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({} as any))
  const apiKey: string = (body.apiKey || '').trim()
  const eventTypeId = parseInt(String(body.eventTypeId || ''), 10)
  if (!apiKey) {
    return NextResponse.json(
      { success: false, errors: { apiKey: 'API key is required' } }, { status: 400 },
    )
  }

  const noEventType = !Number.isFinite(eventTypeId) || eventTypeId <= 0
  if (noEventType) {
    try {
      const me = await getMe(apiKey)
      const detail = await listEventTypesDetailed(apiKey)
      return NextResponse.json({
        success: false,
        needsEventType: true,
        account: { username: me.username, email: me.email, timeZone: me.timeZone },
        eventTypes: detail.eventTypes.map((et) => ({
          id: et.id, title: et.title, slug: et.slug, lengthInMinutes: et.lengthInMinutes,
        })),
      })
    } catch (e) {
      if (e instanceof CalcomError && (e.status === 401 || e.status === 403)) {
        return NextResponse.json(
          { success: false, errors: { apiKey: 'Cal.com rejected this key' } }, { status: 400 },
        )
      }
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : 'Cal.com unreachable' },
        { status: 400 },
      )
    }
  }

  let me, eventType
  try {
    const v = await validateConnection(apiKey, eventTypeId)
    me = v.me
    eventType = v.eventType
  } catch (e) {
    if (e instanceof CalcomError) {
      if (e.status === 401 || e.status === 403) {
        return NextResponse.json(
          { success: false, errors: { apiKey: 'Cal.com rejected this key' } }, { status: 400 },
        )
      }
      return NextResponse.json(
        { success: false, error: `Cal.com error: ${e.message}` }, { status: 400 },
      )
    }
    throw e
  }

  // Drop any prior webhook on the same business before registering fresh.
  if (ownership.cal_com_api_key && ownership.cal_com_webhook_id) {
    try { await deleteWebhook(ownership.cal_com_api_key, ownership.cal_com_webhook_id) } catch {}
  }

  const subscriberUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/webhooks/cal/${ownership.id}`
  const webhookSecret = crypto.randomBytes(32).toString('hex')
  let webhookId: string | null = null
  let webhookSecretToStore: string | null = webhookSecret
  let webhookError: string | null = null
  try {
    const wh = await registerOrAdoptWebhook(apiKey, subscriberUrl, webhookSecret)
    webhookId = wh.id
    webhookSecretToStore = wh.secret
    if (wh.adopted && !wh.secret) {
      logger.warn('Cal.com webhook adopted without secret (rep path)', {
        businessId: ownership.id,
      })
    }
  } catch (e) {
    webhookError = e instanceof Error ? e.message : 'Unknown'
    // Don't kill the connection - the dashboard's live-merge fallback
    // and the calcom-sync cron will keep events flowing even without
    // a webhook. But log loud + admin-notify so this gets reconnected
    // before going stale.
    logger.error('Cal.com webhook registration failed (rep path)', {
      businessId: ownership.id, error: webhookError,
    })
    try {
      const { notifyAdmin } = await import('@/lib/notifications/notify')
      await notifyAdmin({
        type: 'calcom.webhook_register_failed',
        severity: 'warning',
        title: 'Cal.com webhook did not register (rep flow)',
        body: `Rep connected Cal.com for business ${ownership.id} but webhook registration failed (${webhookError}). Live-merge + cron will cover; client should hit Re-sync calendar in settings to recover.`,
        metadata: { business_id: ownership.id, error: webhookError, rep_user_id: auth.userId },
      })
    } catch { /* non-fatal */ }
  }

  const { error: updateError } = await supabaseAdmin
    .from('businesses')
    .update({
      cal_com_api_key: apiKey,
      cal_com_user_id: me.id,
      cal_com_username: me.username,
      cal_com_event_type_id: eventType.id,
      cal_com_event_type_slug: eventType.slug,
      cal_com_webhook_id: webhookId,
      cal_com_webhook_secret: webhookSecretToStore,
      calcom_connected: true,
      calcom_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', ownership.id)

  if (updateError) {
    logger.error('Cal.com DB save failed (rep path)', {
      message: updateError.message, businessId: ownership.id,
    })
    return NextResponse.json(
      { success: false, error: `Failed to save: ${updateError.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    account: { username: me.username, email: me.email, timeZone: me.timeZone },
    eventType: { id: eventType.id, title: eventType.title, slug: eventType.slug, lengthInMinutes: eventType.lengthInMinutes },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ success: false, error: 'Sales role required' }, { status: 401 })
  }

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, rep_id, cal_com_api_key, cal_com_webhook_id')
    .eq('id', params.id)
    .eq('rep_id', auth.userId)
    .maybeSingle()
  if (!business) {
    return NextResponse.json({ success: false, error: 'Not your client' }, { status: 404 })
  }

  if (business.cal_com_api_key && business.cal_com_webhook_id) {
    try { await deleteWebhook(business.cal_com_api_key, business.cal_com_webhook_id) } catch {}
  }

  await supabaseAdmin
    .from('businesses')
    .update({
      cal_com_api_key: null,
      cal_com_user_id: null,
      cal_com_username: null,
      cal_com_event_type_id: null,
      cal_com_event_type_slug: null,
      cal_com_webhook_id: null,
      cal_com_webhook_secret: null,
      calcom_connected: false,
      calcom_connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', business.id)

  return NextResponse.json({ success: true })
}
