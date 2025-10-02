import { z } from 'zod'

// Security validation schemas
export const securitySchemas = {
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .transform(val => val.replace(/\D/g, '')), // Remove non-digits

  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(254, 'Email too long'),

  businessName: z.string()
    .min(1, 'Business name required')
    .max(100, 'Business name too long')
    .regex(/^[a-zA-Z0-9\s\-&.,'()]+$/, 'Invalid characters in business name'),

  address: z.string()
    .min(1, 'Address required')
    .max(200, 'Address too long')
    .regex(/^[a-zA-Z0-9\s\-.,#\/]+$/, 'Invalid characters in address'),

  website: z.string()
    .url('Invalid website URL')
    .max(100, 'Website URL too long')
    .optional()
    .or(z.literal('')),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),

  areaCode: z.string()
    .regex(/^\d{3}$/, 'Area code must be 3 digits')
    .transform(val => val.replace(/\D/g, '')),

  message: z.string()
    .min(1, 'Message required')
    .max(1000, 'Message too long')
    .transform(val => val.trim())
}

// Sanitization functions
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '').substring(0, 15)
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().substring(0, 254)
}

// Rate limiting helper
export function isRateLimited(ip: string, action: string, windowMs: number = 60000, maxRequests: number = 10): boolean {
  // This would integrate with Redis in production
  // For now, return false (not rate limited)
  return false
}

// XSS protection
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// SQL injection protection (basic)
export function sanitizeForDatabase(input: string): string {
  return input
    .replace(/['"`;]/g, '') // Remove potential SQL injection characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .replace(/\*\//g, '')
}

// Validate and sanitize request data
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
