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
 init: RequestInit & { version?: string } = {},
): Promise<T> {
 const { version, ...rest } = init
 const res = await fetch(`${CAL_API_BASE}${path}`, {
  ...rest,
  headers: {
   Authorization: `Bearer ${apiKey}`,
   // Cal.com routes endpoints by header version. The default we use
   // for bookings (2026-02-25) doesn't expose GET /event-types - that
   // listing only exists on 2024-06-14. Each call can override.
   'cal-api-version': version || CAL_API_VERSION,
   'Content-Type': 'application/json',
   ...(rest.headers || {}),
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
 // Same version-routing issue as listEventTypes - the GET single endpoint
 // is exposed under 2024-06-14, not the bookings version we default to.
 const res = await calFetch<{ status: string; data: CalcomEventType }>(
  apiKey, `/event-types/${eventTypeId}`, { version: '2024-06-14' },
 )
 return res.data
}

/**
 * Lists every event type the API key can see so the onboarding UI can
 * offer a dropdown. Cal.com v2 requires `?username=` on /event-types,
 * so we fetch /me first to get it. Falls back to v1 (`/v1/event-types`)
 * if v2 doesn't return anything - some older personal API keys still
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

 // The GET /event-types listing requires cal-api-version=2024-06-14;
 // newer versions don't expose it. We pin that version on each call.
 const LIST_VERSION = '2024-06-14'

 // 2) v2 /event-types?username=… with the listing-version header
 if (username) {
  try {
   const res = await calFetch<{ status: string; data: any }>(
    apiKey, `/event-types?username=${encodeURIComponent(username)}`,
    { version: LIST_VERSION },
   )
   const flat = flattenEventTypes(res.data)
   attempts.push(`v2(${LIST_VERSION}) /event-types?username=${username} → ${flat.length} returned`)
   if (flat.length > 0) return { eventTypes: flat, attempts }
  } catch (e) {
   const msg = e instanceof CalcomError ? `${e.status} ${e.message}` : 'unknown'
   attempts.push(`v2(${LIST_VERSION}) /event-types?username=${username} → ${msg}`)
   if (e instanceof CalcomError && (e.status === 401 || e.status === 403)) throw e
  }
 }

 // 3) v2 /event-types (no params), same listing version
 try {
  const res = await calFetch<{ status: string; data: any }>(
   apiKey, '/event-types', { version: LIST_VERSION },
  )
  const flat = flattenEventTypes(res.data)
  attempts.push(`v2(${LIST_VERSION}) /event-types → ${flat.length} returned`)
  if (flat.length > 0) return { eventTypes: flat, attempts }
 } catch (e) {
  const msg = e instanceof CalcomError ? `${e.status} ${e.message}` : 'unknown'
  attempts.push(`v2(${LIST_VERSION}) /event-types → ${msg}`)
 }

 // v1 was decommissioned in early 2025 - no fallback there.
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

/**
 * Lists every webhook on the Cal.com account this API key can see.
 * Used to find an orphan registration whose id we lost (the rewire
 * flow uses this to delete + recreate when 'subscriber url already
 * exists for this user').
 */
export async function listWebhooks(apiKey: string): Promise<Array<{ id: string; subscriberUrl: string; active?: boolean }>> {
 try {
  const res = await calFetch<{ status: string; data: any }>(apiKey, '/webhooks')
  const data: any = res.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.webhooks)) return data.webhooks
  return []
 } catch {
  return []
 }
}

export async function deleteWebhook(apiKey: string, webhookId: string): Promise<void> {
 try {
  await calFetch(apiKey, `/webhooks/${webhookId}`, { method: 'DELETE' })
 } catch (e) {
  // Non-fatal - webhook may already be deleted.
  logger.warn('Failed to delete Cal.com webhook', {
   webhookId, error: e instanceof Error ? e.message : 'Unknown',
  })
 }
}
