import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const phoneSchema = z.string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be less than 15 digits')

export const businessNameSchema = z.string()
  .min(2, 'Business name must be at least 2 characters')
  .max(100, 'Business name must be less than 100 characters')

export const addressSchema = z.string()
  .min(5, 'Address must be at least 5 characters')
  .max(200, 'Address must be less than 200 characters')

// Login form validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Registration form validation
export const registrationSchema = z.object({
  businessName: businessNameSchema,
  businessType: z.enum(['HVAC Services', 'Painting Services', 'Roofing Contractor'], {
    errorMap: () => ({ message: 'Please select a valid business type' })
  }),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  phone: phoneSchema,
  address: addressSchema
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Contact form validation
export const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  email: emailSchema,
  businessName: businessNameSchema.optional(),
  topic: z.enum(['General Question', 'Technical Support', 'Billing Question', 'Partnership Inquiry', 'Feature Request'], {
    errorMap: () => ({ message: 'Please select a topic' })
  }),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be less than 1000 characters')
})

// Admin login validation
export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Admin password is required')
})

// Password reset validation
export const passwordResetSchema = z.object({
  email: emailSchema
})

// New password validation
export const newPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Business settings validation
export const businessSettingsSchema = z.object({
  businessName: businessNameSchema,
  businessType: z.enum(['HVAC Services', 'Painting Services', 'Roofing Contractor']),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  phone: phoneSchema,
  address: addressSchema,
  timeZone: z.string().min(1, 'Time zone is required'),
  businessHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }),
    tuesday: z.object({ open: z.string(), close: z.string() }),
    wednesday: z.object({ open: z.string(), close: z.string() }),
    thursday: z.object({ open: z.string(), close: z.string() }),
    friday: z.object({ open: z.string(), close: z.string() }),
    saturday: z.object({ open: z.string(), close: z.string() }),
    sunday: z.object({ open: z.string(), close: z.string() })
  })
})

// AI agent settings validation
export const aiAgentSettingsSchema = z.object({
  greeting: z.string().min(10, 'Greeting must be at least 10 characters').max(500, 'Greeting must be less than 500 characters'),
  tone: z.enum(['Professional', 'Friendly', 'Casual'], {
    errorMap: () => ({ message: 'Please select a valid tone' })
  }),
  services: z.array(z.string()).min(1, 'At least one service must be selected'),
  pricing: z.object({
    min: z.number().min(0, 'Minimum price must be positive'),
    max: z.number().min(0, 'Maximum price must be positive')
  }).refine((data) => data.max >= data.min, {
    message: "Maximum price must be greater than or equal to minimum price",
    path: ["max"]
  }),
  coverageAreas: z.array(z.string()).min(1, 'At least one coverage area must be specified')
})

// Utility functions
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: Record<string, string>
} {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }
    return { success: false, errors: { general: 'Validation failed' } }
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
}

export function validateCSRFToken(token: string): boolean {
  return token && token.length === 64 && /^[a-f0-9]+$/i.test(token)
}

export function validateRateLimit(ip: string, endpoint: string): boolean {
  // This would integrate with your rate limiting system
  // For now, return true (no rate limiting)
  return true
}

// Export all schemas for easy access
export const schemas = {
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  businessName: businessNameSchema,
  address: addressSchema,
  login: loginSchema,
  registration: registrationSchema,
  contact: contactSchema,
  adminLogin: adminLoginSchema,
  passwordReset: passwordResetSchema,
  newPassword: newPasswordSchema,
  businessSettings: businessSettingsSchema,
  aiAgentSettings: aiAgentSettingsSchema
}

export default {
  validateForm,
  sanitizeInput,
  validateCSRFToken,
  validateRateLimit,
  schemas
}