import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { validateConnection, registerWebhook, deleteWebhook, listEventTypesDetailed, getMe, CalcomError } from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Connect Cal.com - validates the contractor's API key + event type ID,
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

  // If the user hasn't picked an event type yet (or typed a wrong ID),
  // we list everything the API key can see and return it so the UI can
  // show a dropdown. Cal.com's event-type IDs are buried - making the
  // contractor guess the number was the friction in the original flow.
  const noEventTypeProvided = !Number.isFinite(eventTypeId) || eventTypeId <= 0

  if (noEventTypeProvided) {
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
     // Surfaced when the list is empty so the operator can see which
     // Cal.com endpoint was hit and what came back, instead of the
     // unhelpful "No event types found" dead end.
     debug: detail.eventTypes.length === 0 ? detail.attempts : undefined,
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
     try {
      const me2 = await getMe(apiKey)
      const detail = await listEventTypesDetailed(apiKey)
      return NextResponse.json({
       success: false,
       needsEventType: true,
       errors: { eventTypeId: `Event type ${eventTypeId} isn't on this account - pick one below.` },
       account: { username: me2.username, email: me2.email, timeZone: me2.timeZone },
       eventTypes: detail.eventTypes.map((et) => ({
        id: et.id, title: et.title, slug: et.slug, lengthInMinutes: et.lengthInMinutes,
       })),
       debug: detail.eventTypes.length === 0 ? detail.attempts : undefined,
      })
     } catch {
      return NextResponse.json(
       { success: false, errors: { eventTypeId: 'Event type not found on this account' } },
       { status: 400 },
      )
     }
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
  let webhookError: string | null = null
  try {
   const wh = await registerWebhook(apiKey, subscriberUrl, webhookSecret)
   webhookId = wh.id
  } catch (e) {
   webhookError = e instanceof Error ? e.message : 'Unknown'
   // Don't fail the connection - the dashboard now does a live Cal.com
   // pull as a fallback, so the calendar still works without the
   // webhook. But log loudly + admin-notify so this gets fixed.
   logger.error('Cal.com webhook registration failed', {
    businessId: authResult.businessId,
    error: webhookError,
   })
   try {
    const { notifyAdmin } = await import('@/lib/notifications/notify')
    await notifyAdmin({
     type: 'calcom.webhook_register_failed',
     severity: 'warning',
     title: 'Cal.com webhook did not register',
     body: `Business ${authResult.businessId} connected Cal.com but webhook registration failed (${webhookError}). Dashboard will fall back to live polling; reschedules made in Cal.com may show after a refresh but not in real time.`,
     metadata: { business_id: authResult.businessId, error: webhookError },
    })
   } catch { /* non-fatal */ }
  }

  // Pull the business's state so we can derive a timezone that
  // matches where the contractor actually operates - NOT Cal.com's
  // profile timezone. Anthony's Cal.com is in NY but A1 is in
  // Houston; using Cal.com's TZ caused the agent to offer Eastern
  // times when the caller meant Central. State-derived TZ matches
  // reality.
  const { data: bizForTz } = await supabaseAdmin
   .from('businesses')
   .select('state, timezone')
   .eq('id', authResult.businessId)
   .maybeSingle()
  const { resolveBusinessTimezone } = await import('@/lib/timezones')
  const resolvedTz =
   (bizForTz as any)?.timezone
   || resolveBusinessTimezone({ state: (bizForTz as any)?.state })
   || me.timeZone
   || 'America/Chicago'

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
    timezone: resolvedTz,
    updated_at: new Date().toISOString(),
    // Note: deliberately not writing onboarding_step here. The UI derives
    // the step from calcom_connected + forwarding_verified_at flags, and
    // the column type varies between deployments (text in newer migrations,
    // integer in older). Skipping it sidesteps the type mismatch.
   })
   .eq('id', authResult.businessId)

  if (updateError) {
   logger.error('Cal.com DB save failed', {
    code: updateError.code, message: updateError.message,
    details: updateError.details, hint: updateError.hint,
   })
   return NextResponse.json(
    {
     success: false,
     error: `Failed to save Cal.com connection: ${updateError.message}`,
     detail: updateError.details || updateError.hint || updateError.code,
    },
    { status: 500 },
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
 * Disconnect Cal.com - drops the stored key and removes the webhook.
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
