import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')
export const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits')
export const businessNameSchema = z.string().min(2, 'Business name must be at least 2 characters')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')

// Business types
export const businessTypeSchema = z.enum(['HVAC', 'Paint', 'Roofing'])

// Contact form schema
export const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema,
  business: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters')
})

// User registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  businessName: businessNameSchema,
  businessType: businessTypeSchema,
  phone: phoneSchema,
  address: z.string().min(1, 'Address is required'),
  website: z.string().optional(),
  services: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional()
})

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

// Appointment schema
export const appointmentSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: phoneSchema,
  customerEmail: emailSchema.optional(),
  service: z.string().min(1, 'Service is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled']).default('scheduled'),
  estimatedValue: z.number().min(0).default(0),
  address: z.string().optional(),
  notes: z.string().optional()
})
