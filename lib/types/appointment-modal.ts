/**
 * Type definitions for appointment modal components
 */

export interface Appointment {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  service_type: string
  scheduled_date: string | Date
  start_time: string
  end_time?: string | null
  duration: number
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  estimated_value?: number | null
  address?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string
  [key: string]: unknown
}




