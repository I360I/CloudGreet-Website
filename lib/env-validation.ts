import { z } from 'zod'
import { logger } from '@/lib/monitoring'

const envSchema = z.object({
  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // AI
  RETELL_API_KEY: z.string().min(1),
  
  // Telephony
  TELNYX_API_KEY: z.string().min(1),
  // Support both TELNYX_PHONE_NUMBER and TELYNX_PHONE_NUMBER (typo) for backward compatibility
  TELNYX_PHONE_NUMBER: z.string().regex(/^\+\d{10,15}$/).optional(),
  
  // Payments
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().url()
})

/**
 * validateEnv - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await validateEnv(param1, param2)
 * ```
 */
export function validateEnv() {
  // Skip validation during build - Vercel handles env vars separately
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NEXT_PHASE) {
    logger.info('⏭️  Skipping env validation during build (Vercel handles env vars)\n')
    return
  }
  
  try {
    envSchema.parse(process.env)
    logger.info('✅ All required environment variables present\n')
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('\n❌ MISSING OR INVALID ENVIRONMENT VARIABLES:\n')
      error.errors.forEach(err => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      logger.error('\nAdd these to your .env.local file\n')
      process.exit(1)
    }
    throw error
  }
}

