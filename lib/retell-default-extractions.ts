/**
 * Default post-call extraction schema applied to every CloudGreet
 * agent. The contractor doesn't configure this - it's the standard
 * "what every call gets captured" bundle. The dashboard renders the
 * tag (booking_type), the summary, and the structured fields on each
 * call's detail view.
 */

export type RetellPostCallField = {
 type: 'string' | 'number' | 'boolean'
 name: string
 description: string
 examples?: string[]
}

export const DEFAULT_POST_CALL_FIELDS: RetellPostCallField[] = [
 {
  type: 'string',
  name: 'summary',
  description:
   'A one-line summary of the call in plain language - what the caller wanted and what happened. Max ~140 chars.',
  examples: [
   'Sarah called for an AC tune-up and booked Friday at 2pm.',
   'Caller wanted a quote for a furnace replacement; estimate to be emailed.',
   'Emergency: no AC, infant in house. Booked same-day at 4pm.',
  ],
 },
 {
  type: 'string',
  name: 'booking_type',
  description:
   "The single best label for this call. Pick exactly one of: 'booked' (appointment confirmed), 'quote' (asked for an estimate), 'emergency' (urgent / today / asap), 'info_only' (just had questions), 'not_a_fit' (out of service area / wrong service / spam), 'callback' (wants to be called back later). Lowercase, no other values.",
  examples: ['booked', 'emergency', 'quote', 'info_only', 'not_a_fit', 'callback'],
 },
 {
  type: 'string',
  name: 'customer_name',
  description: "The caller's name as stated. Empty string if not given.",
 },
 {
  type: 'string',
  name: 'service_requested',
  description: 'What service the caller asked about (e.g. AC tune-up, drain clearing, roof inspection). Empty string if not stated.',
 },
 {
  type: 'string',
  name: 'service_address',
  description: "The address where the work would be done, if mentioned. Empty string if not given.",
 },
 {
  type: 'number',
  name: 'budget_dollars',
  description: 'Any dollar amount the caller mentioned as budget or expected cost (number only, no $). Null if not mentioned.',
 },
 {
  type: 'boolean',
  name: 'is_emergency',
  description: 'True only if the caller used words like urgent, asap, today, emergency.',
 },
 {
  type: 'string',
  name: 'preferred_callback',
  description: 'When the caller asked to be reached back, free-text (e.g. "Tuesday morning"). Empty string if not requested.',
 },
]

/**
 * Booking-type → display config for the dashboard tag rendering.
 * Centralized so admin + client views render the same colors.
 */
export const BOOKING_TYPE_LABELS: Record<string, { label: string; tone: 'emerald' | 'sky' | 'rose' | 'amber' | 'gray' | 'violet' }> = {
 booked: { label: 'Booked', tone: 'emerald' },
 quote: { label: 'Quote', tone: 'sky' },
 emergency: { label: 'Emergency', tone: 'rose' },
 callback: { label: 'Callback', tone: 'amber' },
 info_only: { label: 'Info only', tone: 'gray' },
 not_a_fit: { label: 'Not a fit', tone: 'gray' },
}
