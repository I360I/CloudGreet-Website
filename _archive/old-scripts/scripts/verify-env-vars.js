#!/usr/bin/env node

// Environment Variables Verification Script
const verifyEnvironmentVariables = async () => {
  console.log('🔍 Verifying Environment Variables...\n')

  const requiredEnvVars = [
    // Database
    { name: 'NEXT_PUBLIC_SUPABASE_URL', type: 'url', required: true },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', type: 'string', required: true },
    
    // Auth
    { name: 'JWT_SECRET', type: 'string', minLength: 32, required: true },
    
    // AI
    { name: 'RETELL_API_KEY', type: 'string', required: true },
    
    // Telephony
    { name: 'TELNYX_API_KEY', type: 'string', required: true },
    { name: 'TELNYX_PHONE_NUMBER', type: 'phone', required: true },
    
    // Payments
    { name: 'STRIPE_SECRET_KEY', type: 'stripe_secret', required: true },
    { name: 'STRIPE_WEBHOOK_SECRET', type: 'stripe_webhook', required: true },
    
    // App
    { name: 'NEXT_PUBLIC_APP_URL', type: 'url', required: true }
  ]

  const optionalEnvVars = [
    { name: 'ADMIN_PASSWORD', type: 'string', required: false },
    { name: 'OPENAI_API_KEY', type: 'string', required: false },
    { name: 'GOOGLE_PLACES_API_KEY', type: 'string', required: false },
    { name: 'RESEND_API_KEY', type: 'string', required: false },
    { name: 'SENTRY_DSN', type: 'string', required: false }
  ]

  let allValid = true
  const results = []

  console.log('📋 Required Environment Variables:')
  console.log('─'.repeat(50))

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar.name]
    let isValid = true
    let message = ''

    if (!value) {
      isValid = false
      message = '❌ MISSING'
    } else {
      switch (envVar.type) {
        case 'url':
          try {
            new URL(value)
            message = '✅ Valid URL'
          } catch {
            isValid = false
            message = '❌ Invalid URL'
          }
          break
        case 'phone':
          if (/^\+\d{10,15}$/.test(value)) {
            message = '✅ Valid phone number'
          } else {
            isValid = false
            message = '❌ Invalid phone number format'
          }
          break
        case 'stripe_secret':
          if (value.startsWith('sk_')) {
            message = '✅ Valid Stripe secret key'
          } else {
            isValid = false
            message = '❌ Invalid Stripe secret key format'
          }
          break
        case 'stripe_webhook':
          if (value.startsWith('whsec_')) {
            message = '✅ Valid Stripe webhook secret'
          } else {
            isValid = false
            message = '❌ Invalid Stripe webhook secret format'
          }
          break
        case 'string':
          if (envVar.minLength && value.length < envVar.minLength) {
            isValid = false
            message = `❌ Too short (min ${envVar.minLength} chars)`
          } else {
            message = '✅ Valid string'
          }
          break
        default:
          message = '✅ Present'
      }
    }

    console.log(`${envVar.name}: ${message}`)
    results.push({ name: envVar.name, valid: isValid, message })
    
    if (!isValid) {
      allValid = false
    }
  }

  console.log('\n📋 Optional Environment Variables:')
  console.log('─'.repeat(50))

  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar.name]
    const status = value ? '✅ Present' : '⚠️  Not set (optional)'
    console.log(`${envVar.name}: ${status}`)
  }

  console.log('\n📊 Summary:')
  console.log('─'.repeat(50))
  
  const validCount = results.filter(r => r.valid).length
  const totalCount = results.length
  
  console.log(`Valid: ${validCount}/${totalCount}`)
  
  if (allValid) {
    console.log('🎉 All required environment variables are valid!')
  } else {
    console.log('❌ Some environment variables are missing or invalid')
    console.log('\n🔧 Fix the issues above before deploying')
  }

  console.log('\n📋 Production Deployment Checklist:')
  console.log('1. Set all environment variables in Vercel dashboard')
  console.log('2. Verify API keys are production keys (not test keys)')
  console.log('3. Test webhook endpoints with production URLs')
  console.log('4. Verify Stripe webhook secret matches production')
  console.log('5. Test Retell AI with production API key')

  return allValid
}

// Run verification
verifyEnvironmentVariables().catch(console.error)

