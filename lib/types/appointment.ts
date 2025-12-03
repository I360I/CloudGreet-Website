/**
 * Type definitions for appointment-related data structures
 */

export interface Appointment {
  id: string
  business_id: string
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  service_type?: string | null
  scheduled_date?: string | null
  start_time?: string | null
  end_time?: string | null
  duration?: number | null
  estimated_value?: number | null
  status?: string | null
  address?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string
  [key: string]: unknown
}





