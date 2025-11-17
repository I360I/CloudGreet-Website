/**
 * Environment Variable Validation Script
 * Validates all required environment variables are set before deployment
 */

const requiredVars = {
  // Database
  DATABASE_URL: 'Supabase connection string',
  SUPABASE_URL: 'Supabase project URL',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key',
  
  // Authentication
  JWT_SECRET: 'JWT token signing secret',
  
  // External Services
  TELNYX_API_KEY: 'Telnyx API key',
  TELNYX_CONNECTION_ID: 'Telnyx connection ID',
  RETELL_API_KEY: 'Retell AI API key',
  STRIPE_SECRET_KEY: 'Stripe secret key',
  STRIPE_WEBHOOK_SECRET: 'Stripe webhook signing secret',
  
  // Application
  NEXT_PUBLIC_BASE_URL: 'Production base URL',
  NEXT_PUBLIC_APP_URL: 'Production app URL',
  NODE_ENV: 'Node environment (production)'
}

const optionalVars = {
  // Google OAuth (optional - only if using calendar)
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'Google OAuth client ID',
  GOOGLE_CLIENT_SECRET: 'Google OAuth client secret',
  
  // Redis (optional - recommended for production)
  REDIS_REST_URL: 'Upstash Redis REST URL',
  REDIS_REST_TOKEN: 'Upstash Redis token',
  
  // Monitoring (optional)
  SLACK_WEBHOOK_URL: 'Slack webhook for alerts',
  NEXT_PUBLIC_SENTRY_DSN: 'Sentry DSN for error tracking',
  
  // Cron (optional)
  CRON_SECRET: 'Secret for cron job authentication',
  
  // Telnyx (optional)
  TELNYX_PHONE_NUMBER: 'Telnyx phone number'
}

function validateEnv() {
  console.log('🔍 Validating Environment Variables\n')
  console.log('='.repeat(60))
  
  const missing = []
  const warnings = []
  const present = []
  
  // Check required variables
  console.log('\n📋 Required Variables:')
  for (const [varName, description] of Object.entries(requiredVars)) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      console.log(`  ❌ ${varName}: MISSING - ${description}`)
      missing.push(varName)
    } else {
      // Mask sensitive values
      const masked = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : value
      console.log(`  ✅ ${varName}: ${masked}`)
      present.push(varName)
    }
  }
  
  // Check optional variables
  console.log('\n📋 Optional Variables:')
  for (const [varName, description] of Object.entries(optionalVars)) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      console.log(`  ⚠️  ${varName}: NOT SET - ${description}`)
      if (varName.includes('REDIS')) {
        warnings.push(`${varName}: Rate limiting will use in-memory storage (not suitable for production)`)
      }
      if (varName.includes('SENTRY')) {
        warnings.push(`${varName}: Error tracking not configured`)
      }
    } else {
      const masked = varName.includes('SECRET') || varName.includes('KEY')
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : value
      console.log(`  ✅ ${varName}: ${masked}`)
      present.push(varName)
    }
  }
  
  // Validate specific formats
  console.log('\n🔍 Format Validation:')
  
  // Validate URLs
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_BASE_URL)
      console.log('  ✅ NEXT_PUBLIC_BASE_URL: Valid URL format')
    } catch {
      console.log('  ❌ NEXT_PUBLIC_BASE_URL: Invalid URL format')
      missing.push('NEXT_PUBLIC_BASE_URL (format)')
    }
  }
  
  // Validate NODE_ENV
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
    warnings.push('NODE_ENV: Should be "production" for production deployment')
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET: Should be at least 32 characters for security')
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Validation Summary')
  console.log('='.repeat(60))
  console.log(`✅ Present: ${present.length}`)
  console.log(`❌ Missing: ${missing.length}`)
  console.log(`⚠️  Warnings: ${warnings.length}`)
  console.log('='.repeat(60))
  
  if (missing.length > 0) {
    console.log('\n❌ Missing Required Variables:')
    missing.forEach(v => console.log(`   - ${v}`))
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    warnings.forEach(w => console.log(`   - ${w}`))
  }
  
  if (missing.length === 0 && warnings.length === 0) {
    console.log('\n✅ All environment variables are properly configured!')
    return 0
  } else if (missing.length === 0) {
    console.log('\n⚠️  Deployment can proceed, but consider addressing warnings.')
    return 0
  } else {
    console.log('\n❌ Cannot deploy: Missing required environment variables.')
    console.log('\nSet missing variables in Vercel:')
    console.log('  1. Go to Project Settings > Environment Variables')
    console.log('  2. Add missing variables')
    console.log('  3. Redeploy')
    return 1
  }
}

// Run validation
const exitCode = validateEnv()
process.exit(exitCode)



 * Environment Variable Validation Script
 * Validates all required environment variables are set before deployment
 */

const requiredVars = {
  // Database
  DATABASE_URL: 'Supabase connection string',
  SUPABASE_URL: 'Supabase project URL',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key',
  
  // Authentication
  JWT_SECRET: 'JWT token signing secret',
  
  // External Services
  TELNYX_API_KEY: 'Telnyx API key',
  TELNYX_CONNECTION_ID: 'Telnyx connection ID',
  RETELL_API_KEY: 'Retell AI API key',
  STRIPE_SECRET_KEY: 'Stripe secret key',
  STRIPE_WEBHOOK_SECRET: 'Stripe webhook signing secret',
  
  // Application
  NEXT_PUBLIC_BASE_URL: 'Production base URL',
  NEXT_PUBLIC_APP_URL: 'Production app URL',
  NODE_ENV: 'Node environment (production)'
}

const optionalVars = {
  // Google OAuth (optional - only if using calendar)
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'Google OAuth client ID',
  GOOGLE_CLIENT_SECRET: 'Google OAuth client secret',
  
  // Redis (optional - recommended for production)
  REDIS_REST_URL: 'Upstash Redis REST URL',
  REDIS_REST_TOKEN: 'Upstash Redis token',
  
  // Monitoring (optional)
  SLACK_WEBHOOK_URL: 'Slack webhook for alerts',
  NEXT_PUBLIC_SENTRY_DSN: 'Sentry DSN for error tracking',
  
  // Cron (optional)
  CRON_SECRET: 'Secret for cron job authentication',
  
  // Telnyx (optional)
  TELNYX_PHONE_NUMBER: 'Telnyx phone number'
}

function validateEnv() {
  console.log('🔍 Validating Environment Variables\n')
  console.log('='.repeat(60))
  
  const missing = []
  const warnings = []
  const present = []
  
  // Check required variables
  console.log('\n📋 Required Variables:')
  for (const [varName, description] of Object.entries(requiredVars)) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      console.log(`  ❌ ${varName}: MISSING - ${description}`)
      missing.push(varName)
    } else {
      // Mask sensitive values
      const masked = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : value
      console.log(`  ✅ ${varName}: ${masked}`)
      present.push(varName)
    }
  }
  
  // Check optional variables
  console.log('\n📋 Optional Variables:')
  for (const [varName, description] of Object.entries(optionalVars)) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      console.log(`  ⚠️  ${varName}: NOT SET - ${description}`)
      if (varName.includes('REDIS')) {
        warnings.push(`${varName}: Rate limiting will use in-memory storage (not suitable for production)`)
      }
      if (varName.includes('SENTRY')) {
        warnings.push(`${varName}: Error tracking not configured`)
      }
    } else {
      const masked = varName.includes('SECRET') || varName.includes('KEY')
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : value
      console.log(`  ✅ ${varName}: ${masked}`)
      present.push(varName)
    }
  }
  
  // Validate specific formats
  console.log('\n🔍 Format Validation:')
  
  // Validate URLs
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_BASE_URL)
      console.log('  ✅ NEXT_PUBLIC_BASE_URL: Valid URL format')
    } catch {
      console.log('  ❌ NEXT_PUBLIC_BASE_URL: Invalid URL format')
      missing.push('NEXT_PUBLIC_BASE_URL (format)')
    }
  }
  
  // Validate NODE_ENV
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
    warnings.push('NODE_ENV: Should be "production" for production deployment')
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET: Should be at least 32 characters for security')
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Validation Summary')
  console.log('='.repeat(60))
  console.log(`✅ Present: ${present.length}`)
  console.log(`❌ Missing: ${missing.length}`)
  console.log(`⚠️  Warnings: ${warnings.length}`)
  console.log('='.repeat(60))
  
  if (missing.length > 0) {
    console.log('\n❌ Missing Required Variables:')
    missing.forEach(v => console.log(`   - ${v}`))
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    warnings.forEach(w => console.log(`   - ${w}`))
  }
  
  if (missing.length === 0 && warnings.length === 0) {
    console.log('\n✅ All environment variables are properly configured!')
    return 0
  } else if (missing.length === 0) {
    console.log('\n⚠️  Deployment can proceed, but consider addressing warnings.')
    return 0
  } else {
    console.log('\n❌ Cannot deploy: Missing required environment variables.')
    console.log('\nSet missing variables in Vercel:')
    console.log('  1. Go to Project Settings > Environment Variables')
    console.log('  2. Add missing variables')
    console.log('  3. Redeploy')
    return 1
  }
}

// Run validation
const exitCode = validateEnv()
process.exit(exitCode)


