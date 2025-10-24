import { z } from 'zod'

// ============================================================================
// BASIC VALIDATION SCHEMAS
// ============================================================================

export const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .max(254, 'Email too long')

export const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be less than 128 characters')

export const phoneSchema = z.string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be less than 15 digits')
  .transform(val => val.replace(/\D/g, '')) // Remove non-digits

export const businessNameSchema = z.string()
  .min(2, 'Business name must be at least 2 characters')
  .max(100, 'Business name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-&.,'()]+$/, 'Invalid characters in business name')

export const addressSchema = z.string()
  .min(5, 'Address must be at least 5 characters')
  .max(200, 'Address must be less than 200 characters')
  .regex(/^[a-zA-Z0-9\s\-.,#\/]+$/, 'Invalid characters in address')

export const websiteSchema = z.string()
  .url('Invalid website URL')
  .max(100, 'Website URL too long')
  .optional()
  .or(z.literal(''))

export const areaCodeSchema = z.string()
  .regex(/^\d{3}$/, 'Area code must be 3 digits')
  .transform(val => val.replace(/\D/g, ''))

export const messageSchema = z.string()
  .min(1, 'Message required')
  .max(1000, 'Message too long')
  .transform(val => val.trim())

// ============================================================================
// FORM VALIDATION SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const registrationSchema = z.object({
  businessName: businessNameSchema,
  businessType: z.string().min(1, 'Business type is required'),
  website: websiteSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  phone: phoneSchema,
  address: addressSchema
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  email: emailSchema,
  businessName: businessNameSchema.optional(),
  topic: z.enum(['General Question', 'Technical Support', 'Billing Question', 'Partnership Inquiry', 'Feature Request'], {
    errorMap: () => ({ message: 'Please select a topic' })
  }),
  message: messageSchema
})

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Admin password is required')
})

export const passwordResetSchema = z.object({
  email: emailSchema
})

export const newPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const businessSettingsSchema = z.object({
  businessName: businessNameSchema,
  businessType: z.enum(['HVAC Services', 'Painting Services', 'Roofing Contractor']),
  website: websiteSchema,
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

// ============================================================================
// SECURITY VALIDATION SCHEMAS
// ============================================================================

export const securitySchemas = {
  phoneNumber: phoneSchema,
  email: emailSchema,
  businessName: businessNameSchema,
  address: addressSchema,
  website: websiteSchema,
  password: passwordSchema,
  areaCode: areaCodeSchema,
  message: messageSchema
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

export function validateRequestData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => e.message).join(', ') 
      }
    }
    return { success: false, error: 'Validation failed' }
  }
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '').substring(0, 15)
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().substring(0, 254)
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function sanitizeForDatabase(input: string): string {
  return input
    .replace(/['"`;]/g, '') // Remove potential SQL injection characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .replace(/\*\//g, '')
}

// ============================================================================
// SECURITY FUNCTIONS
// ============================================================================

export function validateCSRFToken(token: string): boolean {
  return token && token.length === 64 && /^[a-f0-9]+$/i.test(token)
}

export function validateRateLimit(ip: string, endpoint: string): boolean {
  // This would integrate with your rate limiting system
  // For now, return true (no rate limiting)
  return true
}

export function isRateLimited(ip: string, action: string, windowMs: number = 60000, maxRequests: number = 10): boolean {
  // This would integrate with Redis in production
  // For now, return false (not rate limited)
  return false
}

// Security headers
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.telnyx.com https://api.stripe.com https://xpyrovyhktapbvzdxaho.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
}

// ============================================================================
// EXPORTS
// ============================================================================

export const schemas = {
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  businessName: businessNameSchema,
  address: addressSchema,
  website: websiteSchema,
  areaCode: areaCodeSchema,
  message: messageSchema,
  login: loginSchema,
  registration: registrationSchema,
  contact: contactSchema,
  adminLogin: adminLoginSchema,
  passwordReset: passwordResetSchema,
  newPassword: newPasswordSchema,
  businessSettings: businessSettingsSchema,
  aiAgentSettings: aiAgentSettingsSchema,
  security: securitySchemas
}

export default {
  validateForm,
  validateRequestData,
  sanitizeInput,
  sanitizePhoneNumber,
  sanitizeEmail,
  escapeHtml,
  sanitizeForDatabase,
  validateCSRFToken,
  validateRateLimit,
  isRateLimited,
  securityHeaders,
  schemas
}