/**
 * Type definitions for Telnyx webhook event data
 */

export interface TelnyxEventData {
  event_type?: string
  call_control_id?: string
  call_leg_id?: string
  to?: string
  from?: string
  direction?: string
  duration?: number
  status?: string
  [key: string]: unknown
}

export interface TelnyxCallUpdateData {
  status?: string
  duration?: number
  direction?: string
  [key: string]: unknown
}




