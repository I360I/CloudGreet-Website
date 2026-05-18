/**
 * Retell tool definitions auto-attached to every CloudGreet client's
 * Retell LLM at creation time. With these in place a contractor never
 * has to touch Retell's dashboard to wire functions - the agent can
 * book, check availability, text confirmations, transfer to the owner,
 * and end the call all out of the box.
 *
 * Multi-tenancy for the custom tools lives in our webhook: the URL is
 * the same for every client, and `/api/retell/voice-webhook` resolves
 * the calling business from the signed agent_id Retell sends. The
 * Cal.com API key + event-type id are read from `businesses.*` at
 * call time, so a contractor can paste/change their key in settings
 * without touching the agent.
 *
 * `transfer_call` is included only when the business has an
 * escalation_phone on file (otherwise the agent would offer to
 * transfer to a number that doesn't exist).
 */
export type RetellCustomTool = {
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

export type RetellEndCallTool = {
  type: 'end_call'
  name: 'end_call'
  description: string
}

export type RetellTransferCallTool = {
  type: 'transfer_call'
  name: 'transfer_call'
  description: string
  transfer_destination: {
    type: 'predefined'
    number: string
  }
  // Retell's validator requires this alongside transfer_destination.
  // 'cold_transfer' hangs up the agent and rings the destination
  // through Retell's PSTN gateway. We don't set cold_transfer_mode
  // because pinning sip_invite makes regular phone numbers unreachable.
  transfer_option: {
    type: 'cold_transfer'
    show_transferee_as_caller?: boolean
    cold_transfer_mode?: 'sip_invite' | 'sip_refer'
  }
}

export type RetellGeneralTool = RetellCustomTool | RetellEndCallTool | RetellTransferCallTool

export type GetToolsOptions = {
  /** E.164 phone for transfer_call destination - omit to skip the tool. */
  escalationPhone?: string | null
}

export function getRetellGeneralTools(
  webhookUrl: string,
  opts: GetToolsOptions = {},
): RetellGeneralTool[] {
  const tools: RetellGeneralTool[] = [
    {
      type: 'custom',
      name: 'book_appointment',
      description:
        "Books an appointment on the business's calendar. Call this once you have the caller's name, phone, the service they need, and the date/time they agreed to. Returns success + an appointment id. After it succeeds, follow with send_booking_sms to text the caller a confirmation.",
      url: webhookUrl,
      // speak_during covers TTS while the tool runs; speak_after covers
      // the LLM-thinking gap between tool result and the agent's next
      // utterance. Without speak_after, the agent goes silent for
      // 1-2s after every successful book - which is what triggered
      // Retell's "Still there?" filler.
      speak_during_execution: true,
      speak_after_execution: true,
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
              "ISO-8601 start time WITH the explicit timezone offset for the business, e.g., '2026-05-14T14:00:00-05:00' for 2 PM Central. MUST include both the date AND the time AND the offset - never pass a date-only string like '2026-05-14', never pass a time without offset like '2026-05-14T14:00:00'. The offset must reflect the contractor's local timezone, not UTC. A missing offset will silently shift the booking by several hours.",
          },
          review_consent: {
            type: 'boolean',
            description:
              "true if the caller explicitly agreed to receive a follow-up review request text after the appointment. Leave false if they declined or you didn't ask.",
          },
          is_emergency: {
            type: 'boolean',
            description:
              "true if this is a true emergency per the business's EMERGENCY_DEFINITION (e.g. no AC in heat with kids/elderly, no heat in freezing weather, water leak / flood, gas smell, sparks, smoke, sewage backup, anything dangerous). When true, the system routes the booking through emergency dispatch: the owner gets a distinct urgent SMS, the booking can land on a separate emergency Cal.com event type if the business set one up, and the dashboard tags the appointment as emergency. Default false. Don't set true for routine 'I need this fixed soon' urgency - reserve for actual emergencies the caller is alarmed about.",
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
      // Both true: speak during the actual SMS send (~300ms but
      // enough to register as a pause without filler) AND after,
      // so the LLM-thinking gap before the agent's wrap-up doesn't
      // leave dead air.
      speak_during_execution: true,
      speak_after_execution: true,
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
      name: 'cancel_appointment',
      description:
        "Cancels the caller's existing appointment on the business's calendar. Look up by the caller's phone number - we'll find their most recent upcoming booking automatically. Confirm the appointment details with the caller out loud BEFORE calling this so you don't cancel the wrong one. Returns success + the cancelled appointment's date/time so you can confirm the cancellation back to the caller.",
      url: webhookUrl,
      speak_during_execution: true,
      speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          phone: {
            type: 'string',
            description:
              "Caller's phone number in E.164 if available, otherwise as spoken. Default to the inbound caller_id when the caller doesn't provide one - their booking is keyed off this.",
          },
          reason: {
            type: 'string',
            description:
              "Optional. Brief reason the caller gave (e.g. 'job already handled', 'scheduling conflict'). Shows up on the contractor's dashboard so they know why.",
          },
        },
        required: ['phone'],
      },
    },
    {
      type: 'custom',
      name: 'reschedule_appointment',
      description:
        "Moves the caller's existing appointment to a new date/time on the business's calendar. Look up by the caller's phone number - we'll find their most recent upcoming booking automatically. ALWAYS call lookup_availability first to confirm the new time is actually open, then confirm BOTH the old and new times with the caller out loud before calling this. Returns success + the new date/time.",
      url: webhookUrl,
      speak_during_execution: true,
      speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          phone: {
            type: 'string',
            description:
              "Caller's phone number in E.164 if available, otherwise as spoken. Default to the inbound caller_id when the caller doesn't provide one - their booking is keyed off this.",
          },
          new_datetime: {
            type: 'string',
            description:
              "ISO-8601 start time with timezone, e.g., '2026-05-21T10:00:00-05:00'. Use the business's timezone, not UTC. Must be in the future.",
          },
          reason: {
            type: 'string',
            description:
              "Optional. Brief reason for the reschedule. Shows up on the contractor's dashboard.",
          },
        },
        required: ['phone', 'new_datetime'],
      },
    },
    {
      type: 'custom',
      name: 'lookup_availability',
      description:
        "Returns open appointment slots on the business's calendar. Call this BEFORE proposing times to the caller so you only offer slots that are actually free. With no arguments it returns the next 7 days. Pass `date` (YYYY-MM-DD) to scope to a single day.",
      url: webhookUrl,
      speak_during_execution: true,
      speak_after_execution: true,
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
    {
      type: 'end_call',
      name: 'end_call',
      description:
        "Ends the call cleanly. Use only when the caller has clearly wrapped up (\"thanks, bye\", \"I gotta go\") or you've already attempted handoff and given a clear next step. Never end while a question is unanswered or the caller is mid-thought.",
    },
  ]

  // transfer_call needs BOTH transfer_destination AND transfer_option
  // in Retell's current schema. Earlier attempts shipped only
  // transfer_destination and got 400 with "must have required property
  // transfer_option" - which wiped the whole general_tools patch and
  // dropped the four custom tools as collateral damage. The correct
  // shape (per the live API as of 2026-05) is below.
  //
  // Skipped entirely when no phone is on file OR when the saved phone
  // isn't valid E.164, so a malformed number never poisons the patch.
  if (opts.escalationPhone) {
    const normalised = normaliseE164(opts.escalationPhone)
    if (normalised) {
      tools.push({
        type: 'transfer_call',
        name: 'transfer_call',
        description:
          "Cold-transfers the caller to the owner's number. Use only when the caller explicitly asks for a human, when there's a true emergency that needs a person on the line, or after multiple booking attempts have failed. Don't transfer just because the caller is skeptical or a slot is taken. The agent hangs up after dialing; the destination is called via Retell's PSTN gateway.",
        transfer_destination: {
          type: 'predefined',
          number: normalised,
        },
        // We deliberately do NOT pin cold_transfer_mode. The earlier
        // 'sip_invite' value routed via SIP INVITE which only works
        // when the destination is itself a SIP endpoint - regular
        // PSTN phones (which is every contractor) just hear a beep
        // and the transfer fails silently. Omitting the field lets
        // Retell pick the PSTN-correct routing.
        transfer_option: {
          type: 'cold_transfer',
        },
      })
    }
  }

  return tools
}

/**
 * Coerce a US-leaning phone string to strict E.164. Anything we can't
 * confidently parse returns null so transfer_call gets skipped instead
 * of poisoning the entire LLM patch.
 */
function normaliseE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  // 12-digit numbers with non-1 country code are likely real international
  // numbers - trust them.
  if (digits.length >= 11 && digits.length <= 15 && raw.trim().startsWith('+')) {
    return `+${digits}`
  }
  return null
}
