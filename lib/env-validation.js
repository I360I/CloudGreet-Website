const { z } = require('zod')

// Note: logger import removed as it's not compatible with CommonJS
// This validation runs at startup, so console.error is acceptable here

// During build/Vercel, some env vars might not be available - make them optional
const isBuildTime = process.env.VERCEL || process.env.VERCEL_ENV || process.env.NEXT_PHASE || process.env.NODE_ENV === 'production'

const envSchema = z.object({
  // Database - Required
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Auth - Required
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // AI - Optional during build (Vercel will have these)
  RETELL_API_KEY: isBuildTime ? z.string().min(1).optional() : z.string().min(1),
  
  // Telephony - Optional during build (Vercel will have these)
  TELNYX_API_KEY: isBuildTime ? z.string().min(1).optional() : z.string().min(1),
  TELNYX_PHONE_NUMBER: isBuildTime ? z.string().regex(/^\+\d{10,15}$/).optional() : z.string().regex(/^\+\d{10,15}$/),
  
  // Payments - Optional during build (Vercel will have these)
  STRIPE_SECRET_KEY: isBuildTime ? z.string().startsWith('sk_').optional() : z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: isBuildTime ? z.string().startsWith('whsec_').optional() : z.string().startsWith('whsec_'),
  
  // App - Required
  NEXT_PUBLIC_APP_URL: z.string().url()
})

function validateEnv() {
  // Skip validation during build - Vercel handles env vars separately
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NEXT_PHASE) {
    console.log('⏭️  Skipping env validation during build (Vercel handles env vars)\n')
    return
  }
  
  try {
    envSchema.parse(process.env)
    console.log('✅ All required environment variables present\n')
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ MISSING OR INVALID ENVIRONMENT VARIABLES:\n')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      console.error('\nAdd these to your .env.local file\n')
      // Don't exit during build - just warn
      if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
        process.exit(1)
      }
    }
    throw error
  }
}

module.exports = { validateEnv }