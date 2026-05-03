/**
 * Cal.com API v2 client.
 *
 * Per-contractor model: each contractor generates a personal API key in their
 * own Cal.com account (Settings → Security → API Keys) and pastes it into our
 * onboarding flow. We store it on businesses.cal_com_api_key and use it to
 * create / cancel bookings on their behalf. Bookings land on whatever calendar
 * they've connected inside Cal.com (Google, Apple, Outlook).
 */

import { logger } from './monitoring'

const CAL_API_BASE = process.env.CAL_API_BASE || 'https://api.cal.com/v2'
const CAL_API_VERSION = process.env.CAL_API_VERSION || '2026-02-25'

export class CalcomError extends Error {
 status: number
 body: unknown
 constructor(message: string, status: number, body: unknown) {
  super(message)
  this.status = status
  this.body = body
 }
}

async function calFetch<T = any>(
 apiKey: string,
 path: string,
 init: RequestInit = {},
): Promise<T> {
 const res = await fetch(`${CAL_API_BASE}${path}`, {
  ...init,
  headers: {
   Authorization: `Bearer ${apiKey}`,
   'cal-api-version': CAL_API_VERSION,
   'Content-Type': 'application/json',
   ...(init.headers || {}),
  },
 })
 const text = await res.text()
 const body = text ? safeJson(text) : null
 if (!res.ok) {
  throw new CalcomError(
   (body as any)?.error?.message || (body as any)?.message || `Cal.com ${res.status}`,
   res.status,
   body,
  )
 }
 return body as T
}

function safeJson(s: string) {
 try { return JSON.parse(s) } catch { return s }
}

/* ------------------------------ Validation ------------------------------ */

export type CalcomMe = {
 id: number
 username: string | null
 email: string
 name: string | null
 timeZone: string
}

export async function getMe(apiKey: string): Promise<CalcomMe> {
 const res = await calFetch<{ status: string; data: CalcomMe }>(apiKey, '/me')
 return res.data
}

export type CalcomEventType = {
 id: number
 title: string
 slug: string
 lengthInMinutes: number
 hidden: boolean
}

export async function getEventType(apiKey: string, eventTypeId: number): Promise<CalcomEventType> {
 const res = await calFetch<{ status: string; data: CalcomEventType }>(
  apiKey, `/event-types/${eventTypeId}`,
 )
 return res.data
}

/**
 * Lists every event type the API key can see so the onboarding UI can
 * offer a dropdown. Cal.com v2 requires `?username=` on /event-types,
 * so we fetch /me first to get it. Falls back to v1 (`/v1/event-types`)
 * if v2 doesn't return anything — some older personal API keys still
 * route via v1.
 */
export type ListEventTypesResult = {
 eventTypes: CalcomEventType[]
 attempts: string[]
}

export async function listEventTypes(apiKey: string): Promise<CalcomEventType[]> {
 const r = await listEventTypesDetailed(apiKey)
 return r.eventTypes
}

/**
 * Same as listEventTypes but also returns the trace of what was tried,
 * so the onboarding UI can show the operator exactly which Cal.com
 * endpoints came back empty when nothing's listed.
 */
export async function listEventTypesDetailed(apiKey: string): Promise<ListEventTypesResult> {
 const attempts: string[] = []
 const v1Base = (process.env.CAL_API_V1_BASE || 'https://api.cal.com/v1').replace(/\/$/, '')

 // 1) /me
 let username: string | null = null
 try {
  const me = await getMe(apiKey)
  username = me.username
  attempts.push(`v2 /me → username=${username ?? '∅'}`)
 } catch (e) {
  const msg = e instanceof CalcomError ? `${e.status} ${e.message}` : 'unknown'
  attempts.push(`v2 /me → ${msg}`)
 }

 // 2) v2 /event-types?username=…
 if (username) {
  try {
   const res = await calFetch<{ status: string; data: any }>(
    apiKey, `/event-types?username=${encodeURIComponent(username)}`,
   )
   const flat = flattenEventTypes(res.data)
   attempts.push(`v2 /event-types?username=${username} → ${flat.length} returned`)
   if (flat.length > 0) return { eventTypes: flat, attempts }
  } catch (e) {
   const msg = e instanceof CalcomError ? `${e.status} ${e.message}` : 'unknown'
   attempts.push(`v2 /event-types?username=${username} → ${msg}`)
   if (e instanceof CalcomError && (e.status === 401 || e.status === 403)) throw e
  }
 }

 // 3) v2 /event-types (no params, returns own types on some accounts)
 try {
  const res = await calFetch<{ status: string; data: any }>(apiKey, '/event-types')
  const flat = flattenEventTypes(res.data)
  attempts.push(`v2 /event-types → ${flat.length} returned`)
  if (flat.length > 0) return { eventTypes: flat, attempts }
 } catch (e) {
  const msg = e instanceof CalcomError ? `${e.status} ${e.message}` : 'unknown'
  attempts.push(`v2 /event-types → ${msg}`)
 }

 // 4) v1 /event-types?apiKey=
 try {
  const v1Res = await fetch(`${v1Base}/event-types?apiKey=${encodeURIComponent(apiKey)}`, {
   headers: { 'Content-Type': 'application/json' },
  })
  const text = await v1Res.text()
  const j = text ? safeJson(text) : null
  if (v1Res.ok) {
   const types = ((j as any)?.event_types || (j as any)?.eventTypes || []) as any[]
   attempts.push(`v1 /event-types?apiKey=… → ${types.length} returned`)
   if (types.length > 0) {
    return {
     eventTypes: types.map((et) => ({
      id: et.id,
      title: et.title,
      slug: et.slug,
      lengthInMinutes: et.length || et.lengthInMinutes || 30,
      hidden: !!et.hidden,
     })),
     attempts,
    }
   }
  } else {
   const errMsg = (j as any)?.message || (typeof j === 'string' ? j : 'no body')
   attempts.push(`v1 /event-types → ${v1Res.status} ${errMsg}`)
  }
 } catch (e) {
  attempts.push(`v1 /event-types → ${e instanceof Error ? e.message : 'unknown'}`)
 }

 return { eventTypes: [], attempts }
}

function flattenEventTypes(data: any): CalcomEventType[] {
 if (!data) return []
 if (Array.isArray(data)) return data as CalcomEventType[]
 if (Array.isArray(data?.eventTypeGroups)) {
  return data.eventTypeGroups.flatMap((g: any) => g.eventTypes || [])
 }
 if (Array.isArray(data?.eventTypes)) return data.eventTypes
 return []
}

/**
 * Verifies an API key + event type ID pair belongs to the same Cal.com user
 * and returns useful metadata for storing on the business row.
 */
export async function validateConnection(apiKey: string, eventTypeId: number) {
 const me = await getMe(apiKey)
 const eventType = await getEventType(apiKey, eventTypeId)
 return { me, eventType }
}

/* ------------------------------- Bookings ------------------------------- */

export type CalcomBookingInput = {
 startIso: string
 eventTypeId: number
 attendee: {
  name: string
  email: string
  timeZone: string
  phoneNumber?: string
 }
 metadata?: Record<string, string>
 location?: string
 notes?: string
}

export type CalcomBooking = {
 uid: string
 id: number
 status: string
 start: string
 end: string
}

export async function createBooking(
 apiKey: string,
 input: CalcomBookingInput,
): Promise<CalcomBooking> {
 const res = await calFetch<{ status: string; data: CalcomBooking }>(apiKey, '/bookings', {
  method: 'POST',
  body: JSON.stringify({
   start: input.startIso,
   eventTypeId: input.eventTypeId,
   attendee: input.attendee,
   metadata: input.metadata,
   location: input.location,
   bookingFieldsResponses: input.notes ? { notes: input.notes } : undefined,
  }),
 })
 return res.data
}

export async function cancelBooking(
 apiKey: string,
 bookingUid: string,
 reason?: string,
): Promise<void> {
 await calFetch(apiKey, `/bookings/${bookingUid}/cancel`, {
  method: 'POST',
  body: JSON.stringify({ cancellationReason: reason || 'Cancelled in CloudGreet' }),
 })
}

/* ------------------------------- Webhooks ------------------------------- */

export const CAL_WEBHOOK_EVENTS = [
 'BOOKING_CREATED',
 'BOOKING_RESCHEDULED',
 'BOOKING_CANCELLED',
 'BOOKING_REJECTED',
 'BOOKING_REQUESTED',
 'BOOKING_NO_SHOW_UPDATED',
 'MEETING_ENDED',
] as const
export type CalcomWebhookEvent = (typeof CAL_WEBHOOK_EVENTS)[number]

export type CalcomWebhook = {
 id: string
 subscriberUrl: string
 active: boolean
}

export async function registerWebhook(
 apiKey: string,
 subscriberUrl: string,
 secret?: string,
): Promise<CalcomWebhook> {
 const res = await calFetch<{ status: string; data: CalcomWebhook }>(apiKey, '/webhooks', {
  method: 'POST',
  body: JSON.stringify({
   subscriberUrl,
   active: true,
   triggers: CAL_WEBHOOK_EVENTS,
   secret,
  }),
 })
 return res.data
}

export async function deleteWebhook(apiKey: string, webhookId: string): Promise<void> {
 try {
  await calFetch(apiKey, `/webhooks/${webhookId}`, { method: 'DELETE' })
 } catch (e) {
  // Non-fatal — webhook may already be deleted.
  logger.warn('Failed to delete Cal.com webhook', {
   webhookId, error: e instanceof Error ? e.message : 'Unknown',
  })
 }
}
