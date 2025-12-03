/**
 * Type definitions for webhook payloads from external services
 * Ensures type safety when handling webhook events
 */

// Telnyx Voice Webhook Payload
export interface TelnyxVoiceWebhookPayload {
  data?: {
    event_type?: string
    call_control_id?: string
    call_leg_id?: string
    to?: string
    from?: string
    [key: string]: unknown
  }
  event_type?: string
  call_control_id?: string
  call_leg_id?: string
  to?: string
  from?: string
  [key: string]: unknown
}

// Retell Voice Webhook Payload
export interface RetellVoiceWebhookPayload {
  event?: string
  call?: {
    call_id?: string
    from_number?: string
    to_number?: string
    direction?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

// Stripe Webhook Payload (handled by Stripe SDK, but for reference)
export interface StripeWebhookPayload {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
  [key: string]: unknown
}

// SMS Webhook Payload
export interface SMSWebhookPayload {
  data?: {
    from?: string
    to?: string
    text?: string
    [key: string]: unknown
  }
  from?: string
  to?: string
  text?: string
  [key: string]: unknown
}





