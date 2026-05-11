/**
 * Retell custom-function tool definitions.
 *
 * These are attached to every CloudGreet client's Retell LLM at creation
 * time so the agent can book, look up availability, and send confirmation
 * SMS without any per-client configuration in Retell's dashboard.
 *
 * Multi-tenancy lives in our webhook: the URL is the same for every
 * client, and `/api/retell/voice-webhook` resolves the calling business
 * from the signed agent_id Retell sends in the envelope. The Cal.com API
 * key + event-type id are read from `businesses.*` at call time, so a
 * contractor can paste/change their key in settings without touching the
 * agent in Retell.
 *
 * Built-in tools (`end_call`, `transfer_call`) are NOT included here -
 * they're toggled per agent in Retell's dashboard since the transfer
 * destination is per-client.
 */
export type RetellGeneralTool = {
  type: 'custom'
  name: string
  description: string
  url: string
  speak_during_execution?: boolean
  speak_after_execution?: boolean
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export function getRetellGeneralTools(webhookUrl: string): RetellGeneralTool[] {
  return [
    {
      type: 'custom',
      name: 'book_appointment',
      description:
        "Books an appointment on the business's calendar. Call this once you have the caller's name, phone, the service they need, and the date/time they agreed to. Returns success + an appointment id. After it succeeds, follow with send_booking_sms to text the caller a confirmation.",
      url: webhookUrl,
      speak_during_execution: true,
      speak_after_execution: false,
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "Caller's full name as you'd write it on a calendar event.",
          },
          phone: {
            type: 'string',
            description:
              "Caller's phone number in E.164 if you have it, otherwise as spoken. Default to the inbound caller_id when the caller doesn't provide one.",
          },
          service: {
            type: 'string',
            description:
              "Short description of the job, e.g., 'AC not cooling', 'kitchen sink leak', 'roof inspection'.",
          },
          datetime: {
            type: 'string',
            description:
              "ISO-8601 start time with timezone, e.g., '2026-05-14T14:00:00-05:00'. Use the business's timezone, not UTC.",
          },
          review_consent: {
            type: 'boolean',
            description:
              "true if the caller explicitly agreed to receive a follow-up review request text after the appointment. Leave false if they declined or you didn't ask.",
          },
        },
        required: ['name', 'phone', 'service', 'datetime'],
      },
    },
    {
      type: 'custom',
      name: 'send_booking_sms',
      description:
        "Texts the caller a confirmation SMS with the booked date/time. Call this immediately after book_appointment returns a successful appt_id. Pass the same phone you used to book.",
      url: webhookUrl,
      speak_during_execution: false,
      speak_after_execution: false,
      parameters: {
        type: 'object',
        properties: {
          phone: {
            type: 'string',
            description: 'Same phone number used in the preceding book_appointment call.',
          },
          appt_id: {
            type: 'string',
            description: 'The appointment id returned by book_appointment.',
          },
        },
        required: ['phone', 'appt_id'],
      },
    },
    {
      type: 'custom',
      name: 'lookup_availability',
      description:
        "Returns open appointment slots on the business's calendar. Call this BEFORE proposing times to the caller so you only offer slots that are actually free. With no arguments it returns the next 7 days. Pass `date` (YYYY-MM-DD) to scope to a single day.",
      url: webhookUrl,
      speak_during_execution: true,
      speak_after_execution: false,
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: "Optional. ISO date 'YYYY-MM-DD' to scope to one day.",
          },
          duration: {
            type: 'number',
            description: 'Optional. Appointment length in minutes. Default 60.',
          },
        },
      },
    },
  ]
}
