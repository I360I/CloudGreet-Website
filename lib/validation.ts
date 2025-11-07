import { z } from 'zod'

// Common validation schemas
export const businessIdSchema = z.string().uuid('Invalid business ID format')
export const timeframeSchema = z.enum(['7d', '30d', '90d']).default('30d')
export const callIdSchema = z.string().uuid('Invalid call ID format')

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const registrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional()
})

// Utility functions
/**
 * sanitizePhoneNumber - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await sanitizePhoneNumber(param1, param2)
 * ```
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * sanitizeInput - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await sanitizeInput(param1, param2)
 * ```
 */
export function sanitizeInput(input: string): string {
  return input.replace(/[<>\"']/g, '')
}

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

export const securitySchemas = {
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
}

// API-specific schemas
export const roiMetricsSchema = z.object({
  businessId: businessIdSchema
})

export const callAnalyticsSchema = z.object({
  businessId: businessIdSchema,
  timeframe: timeframeSchema.optional()
})

export const aiInsightsSchema = z.object({
  businessId: businessIdSchema
})

export const callRecordingSchema = z.object({
  callId: callIdSchema,
  businessId: businessIdSchema
})

export const qualityMetricsSchema = z.object({
  businessId: businessIdSchema
})

export const leadsScoredSchema = z.object({
  businessId: businessIdSchema
})

// Validation helper function
export function validateQueryParams<T>(schema: z.ZodSchema<T>, params: Record<string, string | string[] | undefined>): T {
  try {
    return schema.parse(params)
  } catch (error) {
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
    }
    throw error
  }
}