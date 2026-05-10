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
  RETELL_WEBHOOK_SECRET: z.string().min(1),

  // Telephony
  TELNYX_API_KEY: z.string().min(1),
  TELNYX_PHONE_NUMBER: z.string().regex(/^\+\d{10,15}$/),
  // Booking-notification + outbound prospecting use this single sender.
  // Without it, contractors silently never get booking alerts.
  CLOUDGREET_NOTIFICATIONS_FROM: z.string().regex(/^\+\d{10,15}$/),

  // Payments
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  // Cron
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be set so cron endpoints aren\'t publicly callable'),

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
  // Skip during the BUILD phase only (Next.js gathering routes, no
  // runtime). Once running on Vercel, env vars are real and missing
  // ones must surface loudly. The previous gate skipped validation
  // for the entire lifetime of any Vercel deployment, so a missing
  // STRIPE_WEBHOOK_SECRET shipped to prod silently.
  const isBuildPhase =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-development-build'
  if (isBuildPhase) {
    logger.info('⏭️  Skipping env validation during build phase\n')
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
      logger.error('\nAdd these to your .env.local file (or Vercel env)\n')
      // Don't process.exit on Vercel - it crashes the function. Throw
      // so the caller can surface a 500 with the missing-var details.
      if (process.env.VERCEL) throw error
      process.exit(1)
    }
    throw error
  }
}

