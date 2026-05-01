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
