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
  // 'warm_transfer' keeps the agent on the line during the dial and
  // runs human-detection: voicemail / no-answer rolls back to the
  // agent so the conversation can continue (e.g. take a message).
  // We don't set cold_transfer_mode because pinning sip_invite makes
  // regular phone numbers unreachable; same idea applies here.
  transfer_option: {
    type: 'cold_transfer' | 'warm_transfer'
    show_transferee_as_caller?: boolean
    cold_transfer_mode?: 'sip_invite' | 'sip_refer'
    // Private whisper played only to the contractor right before the
    // caller is bridged. Stops the handoff from feeling like a random
    // scam call - the contractor hears "CloudGreet transfer for ..."
    // and knows it's legit. Dynamic so it can include actual context
    // (caller name, reason) when the agent has it.
    private_handoff_option?: {
      type: 'prompt'
      prompt: string
    } | {
      type: 'static_message'
      message: string
    }
  }
}

export type RetellGeneralTool = RetellCustomTool | RetellEndCallTool | RetellTransferCallTool

export type GetToolsOptions = {
  /** E.164 phone for transfer_call destination - omit to skip the tool. */
  escalationPhone?: string | null
  /** When true, attach `send_dispatch_request` for businesses that
   *  accept jobs ad-hoc (rideshare, mobile services) instead of
   *  scheduling via Cal.com. The agent uses it for "right now"
   *  requests; the owner texts/calls back to accept. */
  dispatchMode?: boolean
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
  ]

  // Dispatch flow: for businesses that take "right now" jobs and have the
  // owner accept/reject before any calendar event exists (rideshare, mobile
  // services). The agent gathers trip details and fires this; we text the
  // owner a summary and tell the caller they'll get a callback. No Cal.com
  // event is created here - the owner books it manually after accepting.
  if (opts.dispatchMode) {
    tools.push({
      type: 'custom',
      name: 'send_dispatch_request',
      description:
        "Texts the owner a summary of an immediate-pickup / right-now request so they can accept and call the caller back. Use this INSTEAD OF book_appointment when the caller wants service now or in the next couple hours and is not scheduling for a future day. Do not call book_appointment after this - the owner books it themselves once they accept. Tell the caller the owner will text or call them back shortly to confirm.",
      url: webhookUrl,
      speak_during_execution: true,
      speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          customer_name: {
            type: 'string',
            description: "Caller's name as they gave it.",
          },
          customer_phone: {
            type: 'string',
            description:
              "Caller's phone in E.164 if available, otherwise as spoken. Default to inbound caller_id when not provided.",
          },
          pickup: {
            type: 'string',
            description:
              "Pickup address or location as the caller gave it. For rideshare this is where to pick them up; for mobile services this is the service address.",
          },
          dropoff: {
            type: 'string',
            description:
              "Optional. Dropoff or destination address (rideshare). Leave blank when not applicable.",
          },
          party_size: {
            type: 'number',
            description: 'Optional. Number of passengers / people.',
          },
          requested_time: {
            type: 'string',
            description:
              "When the caller wants service. Use 'now' or 'ASAP' for immediate, or a short phrase like 'in 30 minutes', '7pm tonight'. Plain text - no ISO required.",
          },
          notes: {
            type: 'string',
            description:
              'Optional. Anything else the owner should know (luggage, kids, accessibility, job description, etc.).',
          },
        },
        required: ['customer_name', 'customer_phone', 'pickup', 'requested_time'],
      },
    })

    // SmartRide pricing engine. Deterministic quote calculation so the
    // agent doesn't try to do tax + per-mile + surcharge math in its
    // head (and get it wrong on a recorded sales call). Returns final
    // dollar amount the agent can read back exactly. SmartRide-specific
    // for now - the price sheet, county tax table, and time surcharges
    // are hardcoded in the webhook handler. When a second rideshare
    // client onboards we'll lift this into a per-business config.
    tools.push({
      type: 'custom',
      name: 'compute_quote',
      description:
        "Calculates the EXACT dollar amount to quote the caller, including county sales tax and any late-night/early-morning surcharge. ALWAYS call this before quoting a price - don't do the math yourself. Inputs depend on service_type: distance-priced services (airport / point-to-point) need miles (call lookup_drive_time first); hourly services need hours. Returns total_dollars + a spoken_summary you can read back.",
      url: webhookUrl,
      speak_during_execution: true,
      speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          service_type: {
            type: 'string',
            description: "One of: airport_dropoff, airport_pickup, point_to_point, hourly_event, independent_living. Use point_to_point for any non-airport transfer (the system auto-applies the over-50-mile discount).",
          },
          miles: {
            type: 'number',
            description: 'Distance in miles. REQUIRED for distance-priced services. Pull this from a prior lookup_drive_time call - do not estimate.',
          },
          hours: {
            type: 'number',
            description: 'Hours of service. REQUIRED for hourly_event (2 hr minimum) and independent_living. Whole or half hours.',
          },
          pickup_hour_24: {
            type: 'number',
            description: 'Pickup time hour in 24-hour format (0-23). Used to apply the late-night/early-morning surcharge. e.g., 2 for 2 AM, 14 for 2 PM, 23 for 11 PM.',
          },
          pickup_minute: {
            type: 'number',
            description: 'Optional. Pickup time minute (0-59). Defaults to 0. Important for the 5:30 AM and 6:45 AM surcharge boundaries.',
          },
          origin_county: {
            type: 'string',
            description: "Origin county name WITHOUT the word 'County' - one of: Franklin, Delaware, Licking, Fairfield, Madison, Pickaway, Union, Morrow. Pull from lookup_drive_time's origin_county field. If unknown, omit and the quote skips tax (tell the caller tax will be added at booking).",
          },
          cmh_airport: {
            type: 'boolean',
            description: "true if the pickup OR dropoff is CMH (John Glenn Columbus Airport) - adds the $4.50 airport fee. False for LCK (no fee). Pull from lookup_drive_time's is_airport_origin or your knowledge of the address.",
          },
        },
        required: ['service_type'],
      },
    })

    // Rideshare-specific: agent needs real drive-time estimates to give
    // callers a realistic pickup ETA + total trip duration. Hits Google
    // Routes API with TRAFFIC_AWARE so the number reflects ACTUAL
    // conditions, not a static map distance. Also returns origin
    // county for the quote tool's tax calculation.
    tools.push({
      type: 'custom',
      name: 'lookup_drive_time',
      description:
        "Looks up real drive time + distance between two addresses INCLUDING current traffic. ALSO returns origin_county and is_airport_origin which feed directly into compute_quote. Use this BEFORE compute_quote on any distance-priced ride. Don't guess miles or duration - always call this.",
      url: webhookUrl,
      speak_during_execution: true,
      speak_after_execution: true,
      parameters: {
        type: 'object',
        properties: {
          origin: {
            type: 'string',
            description: "Starting address as the caller gave it, or a landmark name (e.g., 'John Glenn Columbus airport', '3310 Morse Road Columbus OH', 'OhioHealth McMillen'). Plain text - Google geocodes it.",
          },
          destination: {
            type: 'string',
            description: 'Destination address or landmark name in the same plain-text format as origin.',
          },
          departure_time: {
            type: 'string',
            description: "Optional. ISO-8601 timestamp WITH offset for when the trip starts, e.g., '2026-05-26T21:00:00-04:00' for 9 PM ET. If omitted, uses 'now' (current traffic). Use a future timestamp when the caller is scheduling ahead and you want traffic for THAT time, not now.",
          },
        },
        required: ['origin', 'destination'],
      },
    })
  }

  tools.push({
    type: 'end_call',
    name: 'end_call',
    description:
      "Ends the call cleanly. Use only when the caller has clearly wrapped up (\"thanks, bye\", \"I gotta go\") or you've already attempted handoff and given a clear next step. Never end while a question is unanswered or the caller is mid-thought.",
  })

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
          "Warm-transfers the caller to the owner's number. Use only when the caller explicitly asks for a human, when there's a true emergency that needs a person on the line, or after multiple booking attempts have failed. Don't transfer just because the caller is skeptical or a slot is taken. Retell does human detection - the caller is only bridged once a real person picks up; if the dial goes to voicemail or no-answer, the call comes back to you and you should offer to take a message.",
        transfer_destination: {
          type: 'predefined',
          number: normalised,
        },
        // warm_transfer (vs cold_transfer) keeps the agent on the call
        // during the dial and runs Retell's human-detection: if the
        // destination doesn't answer or hits voicemail, control snaps
        // back to the agent and the conversation continues. Previously
        // cold_transfer just dialed-and-disconnected so a no-answer
        // killed the call entirely with nothing for the caller.
        transfer_option: {
          type: 'warm_transfer',
          // Whisper context to the contractor before bridging. The
          // prompt is intentionally short - Retell injects call
          // context automatically, and the explicit "CloudGreet
          // transfer" prefix is what makes the recipient recognize
          // this isn't a random scam call.
          private_handoff_option: {
            type: 'prompt',
            prompt:
              "Briefly announce yourself in one sentence, starting with 'CloudGreet transfer.' Then summarize who is calling and why in plain words. Example: 'CloudGreet transfer. John on the line, his AC stopped cooling.' Keep it under 12 words.",
          },
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
