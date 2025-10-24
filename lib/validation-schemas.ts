import { z } from 'zod'

// Standard validation schemas for consistent API interfaces

export const appointmentCreateSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(100),
  customer_phone: z.string().min(10, 'Valid phone number required'),
  customer_email: z.string().email('Valid email required').optional(),
  service: z.string().min(1, 'Service type is required').max(100),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  issue_description: z.string().max(500).optional(),
  estimated_value: z.number().min(0).optional()
})

export const appointmentUpdateSchema = z.object({
  customer_name: z.string().min(1).max(100).optional(),
  customer_phone: z.string().min(10).optional(),
  customer_email: z.string().email().optional(),
  service: z.string().min(1).max(100).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  issue_description: z.string().max(500).optional(),
  estimated_value: z.number().min(0).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional()
})

export const smsSendSchema = z.object({
  to: z.string().min(10, 'Valid phone number required'),
  message: z.string().min(1, 'Message is required').max(1600),
  type: z.enum(['manual_reply', 'appointment_reminder', 'follow_up', 'marketing']).default('manual_reply')
})

export const callLogSchema = z.object({
  from_number: z.string().min(10),
  to_number: z.string().min(10),
  duration: z.number().min(0),
  status: z.enum(['answered', 'missed', 'busy', 'failed', 'completed']),
  direction: z.enum(['inbound', 'outbound']),
  caller_name: z.string().optional(),
  caller_city: z.string().optional(),
  caller_state: z.string().optional(),
  service_requested: z.string().optional(),
  urgency: z.string().optional(),
  budget_mentioned: z.number().optional(),
  notes: z.string().optional(),
  follow_up_required: z.boolean().default(false),
  recording_url: z.string().url().optional(),
  transcription_text: z.string().optional()
})

export const businessUpdateSchema = z.object({
  business_name: z.string().min(2).max(100).optional(),
  business_type: z.string().min(1).max(50).optional(),
  phone: z.string().min(10).optional(),
  address: z.string().min(5).max(200).optional(),
  website: z.string().url().optional(),
  description: z.string().max(500).optional(),
  services: z.array(z.string()).optional(),
  service_areas: z.array(z.string()).optional(),
  business_hours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }),
    tuesday: z.object({ open: z.string(), close: z.string() }),
    wednesday: z.object({ open: z.string(), close: z.string() }),
    thursday: z.object({ open: z.string(), close: z.string() }),
    friday: z.object({ open: z.string(), close: z.string() }),
    saturday: z.object({ open: z.string(), close: z.string() }),
    sunday: z.object({ open: z.string(), close: z.string() })
  }).optional()
})

export const aiAgentUpdateSchema = z.object({
  greeting_message: z.string().min(10).max(500).optional(),
  tone: z.enum(['professional', 'friendly', 'casual']).optional(),
  services: z.array(z.string()).min(1).optional(),
  pricing: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).optional(),
  coverage_areas: z.array(z.string()).min(1).optional(),
  ai_agent_enabled: z.boolean().optional()
})

// Common query parameters
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
})

export const dateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeframe: z.enum(['24h', '7d', '30d', '90d']).default('7d')
})

export const searchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  filter: z.string().optional(),
  status: z.string().optional()
})
