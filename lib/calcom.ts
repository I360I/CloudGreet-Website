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
 locations?: CalcomLocation[]
}

/**
 * Cal.com v2 location shape. Common types:
 *   { type: 'integrations:google:meet' }      → Google Meet
 *   { type: 'integrations:zoom_video' }       → Zoom
 *   { type: 'integrations:daily' }            → Cal Video
 *   { type: 'attendeePhoneNumber' }           → Phone (attendee number)
 *   { type: 'attendeeAddress' }               → In person at attendee address
 *   { type: 'address', address: '123 Main' }  → Fixed address
 *   { type: 'link', link: 'https://...' }     → Custom link
 */
export type CalcomLocation = {
 type: string
 address?: string
 link?: string
 phone?: string
}

export type EventTypeLocationPreset = 'google_meet' | 'zoom' | 'cal_video' | 'attendee_phone' | 'attendee_address'

/**
 * Build a Cal.com v2 location. Note that Cal.com v2 PATCH /event-types
 * only accepts these `type` values: `address`, `link`, `integration`,
 * `phone`, plus `attendeeAddress` and `attendeePhoneNumber` shorthands.
 * The older `integrations:google:meet` / `integrations:zoom_video`
 * values are v1-only and get rejected.
 *
 * For Meet/Zoom we therefore route through `{ type: 'link', link }`
 * with whatever URL the rep pastes in (their personal Meet room, their
 * Zoom PMI, etc). For Cal Video we use the `integration` type with the
 * `daily` slug.
 */
export function locationFromPreset(
 preset: EventTypeLocationPreset,
 opts?: { link?: string; address?: string; phone?: string },
): CalcomLocation {
 switch (preset) {
  case 'google_meet':
  case 'zoom':
   return { type: 'link', link: opts?.link || '' }
  case 'cal_video': return { type: 'integration', link: 'daily' }
  case 'attendee_phone': return { type: 'attendeePhoneNumber' }
  case 'attendee_address':
   return opts?.address
    ? { type: 'address', address: opts.address }
    : { type: 'attendeeAddress' }
 }
}

/**
 * Update an event type's title / slug / location via Cal.com v2 API.
 * Used by the CloudGreet settings page so contractors can rename and
 * re-locate their event types without leaving our UI.
 */
export async function updateEventType(
 apiKey: string,
 eventTypeId: number,
 patch: {
  title?: string
  slug?: string
  locations?: CalcomLocation[]
  lengthInMinutes?: number
  /** Minutes of lead time required before a slot is offered to the caller. 0 = same-minute. */
  minimumBookingNotice?: number
  /** Cal.com schedule id to attach. Use this to put the emergency event type on a 24/7 schedule. */
  scheduleId?: number
 },
): Promise<CalcomEventType> {
 const res = await calFetch<{ status: string; data: CalcomEventType }>(
  apiKey,
  `/event-types/${eventTypeId}`,
  { version: '2024-06-14', method: 'PATCH', body: JSON.stringify(patch) },
 )
 return res.data
}

/**
 * Create a Cal.com schedule with 24/7 availability and return its id.
 * Used to put the emergency event type on always-on hours - regular
 * business hours don't work for a real emergency.
 */
export async function create24x7Schedule(
 apiKey: string,
 input: { name?: string; timeZone: string },
): Promise<{ id: number }> {
 const res = await calFetch<{ status: string; data: { id: number } }>(
  apiKey,
  `/schedules`,
  {
   version: '2024-06-11',
   method: 'POST',
   body: JSON.stringify({
    name: input.name || 'CloudGreet Emergency 24/7',
    timeZone: input.timeZone,
    isDefault: false,
    availability: [{
     days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
     startTime: '00:00',
     endTime: '23:59',
    }],
   }),
  },
 )
 return res.data
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

export type CalcomBookingListItem = {
 uid: string
 id: number
 status: string
 start: string
 end: string
 title?: string
 attendees?: Array<{ name?: string; email?: string; phoneNumber?: string }>
 metadata?: Record<string, any>
 eventType?: { id?: number; slug?: string; title?: string }
}

/**
 * List bookings on the contractor's Cal.com account in a date range.
 * Used by the dashboard calendar to display bookings made directly in
 * Cal.com (manual additions, reschedules, third-party sync), not just
 * the ones our webhook landed in the local appointments table.
 *
 * Cal.com paginates with `take` + `skip`; we walk pages so a busy
 * contractor's week isn't capped at 100 events.
 */
export async function listBookings(
 apiKey: string,
 input: { afterStart: string; beforeEnd: string },
): Promise<CalcomBookingListItem[]> {
 const all: CalcomBookingListItem[] = []
 const take = 100
 for (let skip = 0; skip < 1000; skip += take) {
  const qs = new URLSearchParams({
   afterStart: input.afterStart,
   beforeEnd: input.beforeEnd,
   take: String(take),
   skip: String(skip),
  })
  // /bookings is exposed under 2024-08-13 - the 2026-02-25 default we
  // use for createBooking doesn't return the same shape on GET.
  const res = await calFetch<{ status: string; data: CalcomBookingListItem[] }>(
   apiKey, `/bookings?${qs.toString()}`, { version: '2024-08-13' },
  )
  const items = res?.data || []
  all.push(...items)
  if (items.length < take) break
 }
 return all
}

/**
 * Reschedule a Cal.com booking by UID to a new start time. Cal.com
 * computes the end from the event-type's lengthInMinutes, so we only
 * pass the new start. The endpoint returns a *new* booking (Cal.com
 * cancels the old uid and creates a fresh one) - we hand the new uid
 * back so the caller can stamp it onto our local appointment row.
 */
export async function rescheduleBooking(
 apiKey: string,
 uid: string,
 newStartIso: string,
 reason?: string,
): Promise<CalcomBooking> {
 const res = await calFetch<{ status: string; data: CalcomBooking }>(
  apiKey,
  `/bookings/${encodeURIComponent(uid)}/reschedule`,
  {
   method: 'POST',
   body: JSON.stringify({
    start: newStartIso,
    reschedulingReason: reason || 'Rescheduled by caller via CloudGreet AI',
   }),
   version: '2024-08-13',
  },
 )
 return res.data
}

/**
 * Fetch a single Cal.com booking by its UID. Used by the appointment
 * detail drawer when the dashboard's week-calendar merged a live
 * Cal.com booking that hasn't been synced to our DB yet - clicking it
 * needs to render real info instead of failing the local DB lookup.
 */
export async function getBookingByUid(
 apiKey: string,
 uid: string,
): Promise<CalcomBookingListItem | null> {
 try {
  const res = await calFetch<{ status: string; data: CalcomBookingListItem }>(
   apiKey, `/bookings/${encodeURIComponent(uid)}`, { version: '2024-08-13' },
  )
  return res?.data || null
 } catch {
  return null
 }
}

/* -------------------------------- Slots --------------------------------- */

/**
 * Returns slot start-times the contractor's Cal.com calendar reports as
 * available for the given event type and window. This is the right
 * source of truth (not our local appointments table) because it
 * accounts for everything Cal.com knows about: manual Cal.com
 * bookings, third-party calendar sync (Google/Apple/Outlook),
 * blackout periods, and the contractor's working hours - things our
 * own DB has no visibility into.
 *
 * Returns ISO start-time strings sorted ascending.
 */
export async function listAvailableSlots(
 apiKey: string,
 input: { eventTypeId: number; startIso: string; endIso: string; timeZone?: string },
): Promise<string[]> {
 const qs = new URLSearchParams({
  eventTypeId: String(input.eventTypeId),
  start: input.startIso,
  end: input.endIso,
 })
 if (input.timeZone) qs.set('timeZone', input.timeZone)

 // /slots is exposed under 2024-09-04. Older/newer versions either
 // 404 or return a different shape. Pin explicitly so version
 // drift on createBooking doesn't break availability lookup.
 const res = await calFetch<{ status: string; data: any }>(
  apiKey, `/slots?${qs.toString()}`, { version: '2024-09-04' },
 )

 // Cal.com 2024-09-04 returns one of two shapes:
 //   { data: { '2026-05-14': [{ start: '2026-05-14T14:00:00.000Z' }, ...], ... } }
 //   { data: [{ start: '...' }, ...] }
 // Both flatten to the same array of start times.
 const data = res?.data
 const starts: string[] = []
 if (Array.isArray(data)) {
  for (const slot of data) {
   const s = slot?.start || slot?.time
   if (typeof s === 'string') starts.push(s)
  }
 } else if (data && typeof data === 'object') {
  for (const day of Object.values(data as Record<string, any>)) {
   if (!Array.isArray(day)) continue
   for (const slot of day) {
    const s = slot?.start || slot?.time
    if (typeof s === 'string') starts.push(s)
   }
  }
 }
 return starts.sort()
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

/**
 * Register a Cal.com webhook, adopting an existing one if Cal.com says the
 * subscriber URL is already registered for this user. Returns the webhook
 * id and a flag for whether we created it fresh or adopted an existing
 * registration. Callers should treat `adopted: true` as success and skip
 * the "registration failed" alert path.
 *
 * Why: after a contractor disconnects/reconnects (or after we churn through
 * test resets), Cal.com sometimes still has the prior webhook on file even
 * though our row lost the id. The pre-delete sweep in ensureCalcomWebhook
 * relies on listWebhooks returning the duplicate, but v2 has been observed
 * to refuse the POST while also hiding the duplicate from the list scope
 * we query. Catching the error and re-listing covers that gap; if we still
 * can't find the id we treat the existing-but-unknown webhook as adopted
 * and stop alerting — Cal.com will still deliver to our URL.
 */
export async function registerOrAdoptWebhook(
 apiKey: string,
 subscriberUrl: string,
 secret?: string,
): Promise<{ id: string | null; secret: string | null; adopted: boolean }> {
 try {
  const wh = await registerWebhook(apiKey, subscriberUrl, secret)
  return { id: wh.id, secret: secret ?? null, adopted: false }
 } catch (e) {
  const msg = e instanceof Error ? e.message : String(e)
  if (!/already exists/i.test(msg)) throw e
  // Cal.com refused the POST because an earlier webhook for this URL is
  // still on file. Sweep every duplicate via the list endpoint and retry —
  // we need our own secret stored, otherwise signature verification on the
  // receiver fails and we'd reject deliveries.
  try {
   const all = await listWebhooks(apiKey)
   for (const w of all || []) {
    if (w?.subscriberUrl === subscriberUrl && w?.id) {
     try { await deleteWebhook(apiKey, w.id) } catch { /* non-fatal */ }
    }
   }
   const wh = await registerWebhook(apiKey, subscriberUrl, secret)
   return { id: wh.id, secret: secret ?? null, adopted: false }
  } catch (retryErr) {
   // The duplicate is invisible to our list scope. Last resort: adopt
   // whatever we can find by id so we at least clear the alert. Deliveries
   // will fail signature verification until the contractor rewires, but
   // this is better than spamming admin notifications forever.
   try {
    const all = await listWebhooks(apiKey)
    const match = (all || []).find((w) => w?.subscriberUrl === subscriberUrl)
    if (match?.id) return { id: match.id, secret: null, adopted: true }
   } catch { /* fall through */ }
   return { id: null, secret: null, adopted: true }
  }
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

// ---------------------------------------------------------------------------
// Connected calendars (the "Check for conflicts" toggles in Cal.com settings)
// ---------------------------------------------------------------------------

export type ConflictCalendar = {
 name: string
 externalId: string
 credentialId: number
 integration: string
 isSelected: boolean
 readOnly: boolean
 primary: boolean
}
export type ConnectedCalendarGroup = {
 title: string
 integrationType: string
 calendars: ConflictCalendar[]
}

/**
 * List the contractor's connected calendars and which are currently checked
 * for conflicts (isSelected). Mirrors Cal.com Settings -> Calendars.
 */
export async function listConnectedCalendars(apiKey: string): Promise<ConnectedCalendarGroup[]> {
 const body = await calFetch<any>(apiKey, '/calendars', { method: 'GET' })
 const groups = body?.data?.connectedCalendars || []
 return groups.map((g: any) => ({
  title: g?.integration?.title || g?.integration?.type || 'Calendar',
  integrationType: g?.integration?.type || '',
  calendars: (g?.calendars || []).map((c: any) => ({
   name: c.name || c.externalId || 'Calendar',
   externalId: c.externalId,
   credentialId: c.credentialId,
   integration: c.integration,
   isSelected: !!c.isSelected,
   readOnly: !!c.readOnly,
   primary: !!c.primary,
  })),
 }))
}

/** Turn conflict-checking on (select) or off (deselect) for a single calendar. */
export async function setCalendarConflictCheck(
 apiKey: string,
 cal: { integration: string; externalId: string; credentialId: number },
 enabled: boolean,
): Promise<void> {
 await calFetch(apiKey, '/selected-calendars', {
  method: enabled ? 'POST' : 'DELETE',
  body: JSON.stringify({
   integration: cal.integration,
   externalId: cal.externalId,
   credentialId: cal.credentialId,
  }),
 })
}
