const { z } = require('zod')

// Note: logger import removed as it's not compatible with CommonJS
// This validation runs at startup, so console.error is acceptable here

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
  TELNYX_PHONE_NUMBER: z.string().regex(/^\+\d{10,15}$/),
  
  // Payments
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().url()
})

function validateEnv() {
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
      process.exit(1)
    }
    throw error
  }
}

module.exports = { validateEnv }