/**
 * Type definitions for real-time data structures
 */

export interface RealtimeCall {
  id: string
  from_number?: string
  to_number?: string
  status?: string
  duration?: number
  created_at: string
  [key: string]: unknown
}

export interface RealtimeAppointment {
  id: string
  customer_name?: string
  service_type?: string
  estimated_value?: number
  created_at: string
  [key: string]: unknown
}

export interface RealtimeSMS {
  id: string
  from?: string
  to?: string
  text?: string
  created_at: string
  [key: string]: unknown
}

export interface RealtimeData {
  calls?: RealtimeCall[]
  appointments?: RealtimeAppointment[]
  sms?: RealtimeSMS[]
  [key: string]: unknown
}





