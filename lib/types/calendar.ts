/**
 * Type definitions for calendar-related data structures
 */

export interface CalendarDay {
  date: string
  appointments: CalendarAppointment[]
  totalAppointments: number
  totalRevenue: number
}

export interface CalendarAppointment {
  id: string
  customer_name: string
  service_type: string
  scheduled_date: string
  start_time: string
  duration: number
  estimated_value?: number | null
  status: string
  [key: string]: unknown
}

export interface CalendarResponse {
  success: boolean
  days: CalendarDay[]
  [key: string]: unknown
}




