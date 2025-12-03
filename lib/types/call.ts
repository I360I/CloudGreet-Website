/**
 * Type definitions for call-related data structures
 */

export interface Call {
  id: string
  business_id: string
  from_number?: string | null
  to_number?: string | null
  status?: string | null
  call_status?: string | null
  duration?: number | null
  call_duration?: number | null
  satisfaction_rating?: number | null
  satisfaction_score?: number | null
  created_at: string
  updated_at?: string
  [key: string]: unknown
}

export interface CallMetrics {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  callAnswerRate: number
  avgCallDuration: number
  customerSatisfaction: number
}





