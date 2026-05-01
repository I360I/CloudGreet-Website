import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { validateConnection, registerWebhook, deleteWebhook, CalcomError } from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Connect Cal.com — validates the contractor's API key + event type ID,
 * registers our webhook on their account, persists everything on businesses.
 */
export async function POST(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const apiKey: string = (body.apiKey || '').trim()
  const eventTypeId = parseInt(String(body.eventTypeId || ''), 10)

  if (!apiKey) {
   return NextResponse.json(
    { success: false, errors: { apiKey: 'API key is required' } }, { status: 400 },
   )
  }
  if (!Number.isFinite(eventTypeId) || eventTypeId <= 0) {
   return NextResponse.json(
    { success: false, errors: { eventTypeId: 'Event Type ID must be a number' } }, { status: 400 },
   )
  }

  // Validate against Cal.com.
  let me, eventType
  try {
   const v = await validateConnection(apiKey, eventTypeId)
   me = v.me; eventType = v.eventType
  } catch (e) {
   if (e instanceof CalcomError) {
    if (e.status === 401 || e.status === 403) {
     return NextResponse.json(
      { success: false, errors: { apiKey: 'Cal.com rejected this key' } }, { status: 400 },
     )
    }
    if (e.status === 404) {
     return NextResponse.json(
      { success: false, errors: { eventTypeId: 'Event type not found on this account' } }, { status: 400 },
     )
    }
    return NextResponse.json(
     { success: false, error: `Cal.com error: ${e.message}` }, { status: 400 },
    )
   }
   throw e
  }

  // If we already had a webhook registered on a previous connection, drop it.
  const { data: prev } = await supabaseAdmin
   .from('businesses')
   .select('cal_com_api_key, cal_com_webhook_id')
   .eq('id', authResult.businessId)
   .single()
  if (prev?.cal_com_api_key && prev?.cal_com_webhook_id) {
   await deleteWebhook(prev.cal_com_api_key, prev.cal_com_webhook_id)
  }

  // Register a fresh webhook on the contractor's Cal.com.
  const subscriberUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/webhooks/cal/${authResult.businessId}`
  const webhookSecret = crypto.randomBytes(32).toString('hex')
  let webhookId: string | null = null
  try {
   const wh = await registerWebhook(apiKey, subscriberUrl, webhookSecret)
   webhookId = wh.id
  } catch (e) {
   logger.warn('Cal.com webhook registration failed; continuing without webhook', {
    error: e instanceof Error ? e.message : 'Unknown',
   })
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
    cal_com_webhook_secret: webhookSecret,
    calcom_connected: true,
    calcom_connected_at: new Date().toISOString(),
    onboarding_step: 'forwarding',
    updated_at: new Date().toISOString(),
   })
   .eq('id', authResult.businessId)

  if (updateError) {
   return NextResponse.json(
    { success: false, error: 'Failed to save Cal.com connection' }, { status: 500 },
   )
  }

  return NextResponse.json({
   success: true,
   account: { username: me.username, email: me.email, timeZone: me.timeZone },
   eventType: { id: eventType.id, title: eventType.title, slug: eventType.slug, lengthInMinutes: eventType.lengthInMinutes },
  })
 } catch (e) {
  logger.error('Cal.com connect failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ success: false, error: 'Failed to connect Cal.com' }, { status: 500 })
 }
}

/**
 * Disconnect Cal.com — drops the stored key and removes the webhook.
 */
export async function DELETE(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: business } = await supabaseAdmin
   .from('businesses')
   .select('cal_com_api_key, cal_com_webhook_id')
   .eq('id', authResult.businessId)
   .single()

  if (business?.cal_com_api_key && business?.cal_com_webhook_id) {
   await deleteWebhook(business.cal_com_api_key, business.cal_com_webhook_id)
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
   .eq('id', authResult.businessId)

  return NextResponse.json({ success: true })
 } catch (e) {
  return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
 }
}
