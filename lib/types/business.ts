/**
 * Type definitions for business-related data structures
 */

export interface Business {
  id: string
  owner_id: string
  business_name: string
  business_type: string
  email: string
  phone?: string | null
  phone_number?: string | null
  escalation_phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  website?: string | null
  services?: string[]
  service_areas?: string[]
  business_hours?: Record<string, unknown>
  timezone?: string | null
  greeting_message?: string | null
  tone?: string | null
  ai_tone?: string | null
  retell_agent_id?: string | null
  stripe_customer_id?: string | null
  subscription_status?: string | null
  onboarding_completed?: boolean
  onboarding_step?: number
  calendar_connected?: boolean
  google_calendar_id?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export interface BusinessSelectFields {
  id: string
  retell_agent_id?: string | null
  business_name: string
  phone_number?: string | null
  phone?: string | null
  escalation_phone?: string | null
}





