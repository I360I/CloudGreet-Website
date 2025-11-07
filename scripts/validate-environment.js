#!/usr/bin/env node

/**
 * Comprehensive Environment Variables Validation Script
 * 
 * This script validates all environment variables used in CloudGreet,
 * categorizes them as CRITICAL, REQUIRED, or OPTIONAL,
 * and provides detailed feedback on what breaks without each variable.
 */

const fs = require('fs')
const path = require('path')

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

// Environment variable definitions with usage context
const envVarDefinitions = {
  // CRITICAL - Platform won't work at all without these
  CRITICAL: [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      description: 'Supabase project URL',
      validation: (val) => val && val.startsWith('https://') && val.includes('.supabase.co'),
      whatBreaks: 'User registration, login, dashboard, all data storage, authentication'
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      description: 'Supabase anonymous key for client-side access',
      validation: (val) => val && val.length > 50,
      whatBreaks: 'Client-side database access, user authentication, all frontend data fetching'
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Supabase service role key for server-side access',
      validation: (val) => val && val.length > 50,
      whatBreaks: 'Server-side database operations, admin functions, background jobs'
    },
    {
      name: 'JWT_SECRET',
      description: 'JWT signing secret (minimum 32 characters)',
      validation: (val) => val && val.length >= 32,
      whatBreaks: 'User authentication, protected routes, session management'
    }
  ],

  // REQUIRED - Core features won't work without these
  REQUIRED: [
    {
      name: 'TELNYX_API_KEY',
      altNames: ['TELYNX_API_KEY'], // Support typo variant
      description: 'Telnyx API key for telephony services',
      validation: (val) => val && val.length > 20,
      whatBreaks: 'Phone number provisioning, SMS sending, voice calls'
    },
    {
      name: 'RETELL_API_KEY',
      altNames: ['NEXT_PUBLIC_RETELL_API_KEY'],
      description: 'Retell AI API key for voice AI',
      validation: (val) => val && val.length > 20,
      whatBreaks: 'Voice AI conversations, call handling, Retell webhooks'
    },
    {
      name: 'OPENAI_API_KEY',
      description: 'OpenAI API key for GPT-4 conversations',
      validation: (val) => val && val.startsWith('sk-'),
      whatBreaks: 'AI agent testing, GPT-4 conversations, AI receptionist core functionality',
      category: 'AI'
    },
    {
      name: 'STRIPE_SECRET_KEY',
      description: 'Stripe secret key for payments',
      validation: (val) => val && val.startsWith('sk_'),
      whatBreaks: 'Subscriptions, payments, billing, phone provisioning (requires active subscription)'
    },
    {
      name: 'NEXT_PUBLIC_APP_URL',
      description: 'Application base URL',
      validation: (val) => val && (val.startsWith('http://') || val.startsWith('https://')),
      whatBreaks: 'Webhooks, OAuth callbacks, email links, external API callbacks'
    }
  ],

  // OPTIONAL - Enhanced features, graceful degradation without these
  OPTIONAL: [
    {
      name: 'TELNYX_CONNECTION_ID',
      description: 'Telnyx connection ID for phone numbers',
      validation: (val) => !val || val.length > 5,
      whatBreaks: 'Phone number provisioning may fail, SMS routing issues',
      fallback: 'Can be configured per business in dashboard'
    },
    {
      name: 'TELNYX_MESSAGING_PROFILE_ID',
      description: 'Telnyx messaging profile for SMS',
      validation: (val) => !val || val.length > 5,
      whatBreaks: 'SMS sending may fail, need to configure per message',
      fallback: 'Can use default messaging profile'
    },
    {
      name: 'TELNYX_PUBLIC_KEY',
      description: 'Telnyx public key for webhook verification',
      validation: (val) => !val || val.length > 20,
      whatBreaks: 'Webhook signature verification disabled (security risk)',
      fallback: 'Webhooks work but not verified (not recommended for production)'
    },
    {
      name: 'TELNYX_PHONE_NUMBER',
      description: 'Default Telnyx phone number',
      validation: (val) => !val || /^\+?\d{10,15}$/.test(val.replace(/\s/g, '')),
      whatBreaks: 'Default phone number not set, must provision per business',
      fallback: 'Each business provisions their own number'
    },
    {
      name: 'STRIPE_PUBLISHABLE_KEY',
      description: 'Stripe publishable key for frontend',
      validation: (val) => !val || val.startsWith('pk_'),
      whatBreaks: 'Stripe checkout UI won\'t work, payment forms disabled',
      fallback: 'Can use server-side payment only'
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      description: 'Stripe webhook secret for verification',
      validation: (val) => !val || val.startsWith('whsec_'),
      whatBreaks: 'Stripe webhook signature verification disabled',
      fallback: 'Webhooks work but not verified (not recommended)'
    },
    {
      name: 'RETELL_WEBHOOK_SECRET',
      description: 'Retell webhook secret for verification',
      validation: (val) => !val || val.length > 10,
      whatBreaks: 'Retell webhook signature verification disabled',
      fallback: 'Webhooks work but not verified'
    },
    {
      name: 'TELNYX_WEBHOOK_SECRET',
      description: 'Telnyx webhook secret for verification',
      validation: (val) => !val || val.length > 10,
      whatBreaks: 'Telnyx webhook signature verification disabled',
      fallback: 'Webhooks work but not verified'
    },
    {
      name: 'GOOGLE_CLIENT_ID',
      altNames: ['NEXT_PUBLIC_GOOGLE_CLIENT_ID'],
      description: 'Google OAuth client ID for Calendar integration',
      validation: (val) => !val || val.includes('.apps.googleusercontent.com'),
      whatBreaks: 'Google Calendar OAuth flow, calendar sync',
      fallback: 'Appointments saved to database only, no Google Calendar sync'
    },
    {
      name: 'GOOGLE_CLIENT_SECRET',
      description: 'Google OAuth client secret',
      validation: (val) => !val || val.length > 20,
      whatBreaks: 'Google Calendar OAuth token refresh',
      fallback: 'Calendar integration requires re-auth more often'
    },
    {
      name: 'RESEND_API_KEY',
      description: 'Resend API key for email sending',
      validation: (val) => !val || val.startsWith('re_'),
      whatBreaks: 'Email notifications, admin emails, automated emails',
      fallback: 'SMS notifications only, no email notifications'
    },
    {
      name: 'ADMIN_PASSWORD',
      description: 'Admin dashboard password',
      validation: (val) => !val || val.length >= 8,
      whatBreaks: 'Admin dashboard access (/admin/login)',
      fallback: 'Admin features disabled'
    },
    {
      name: 'ADMIN_EMAIL',
      description: 'Admin email for notifications',
      validation: (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      whatBreaks: 'Admin email notifications, alert emails',
      fallback: 'Admin notifications disabled'
    },
    {
      name: 'SENTRY_DSN',
      altNames: ['NEXT_PUBLIC_SENTRY_DSN'],
      description: 'Sentry DSN for error tracking',
      validation: (val) => !val || val.startsWith('https://'),
      whatBreaks: 'Error tracking, crash reporting, performance monitoring',
      fallback: 'Errors logged to console only'
    },
    {
      name: 'GOOGLE_PLACES_API_KEY',
      description: 'Google Places API key for lead enrichment',
      validation: (val) => !val || val.length > 20,
      whatBreaks: 'Lead enrichment (Apollo Killer feature), business lookup',
      fallback: 'Manual lead entry only, no automatic enrichment'
    },
    {
      name: 'HUNTER_IO_API_KEY',
      description: 'Hunter.io API key for email verification',
      validation: (val) => !val || val.length > 20,
      whatBreaks: 'Email verification via Hunter.io',
      fallback: 'Uses alternative email verification or skips'
    },
    {
      name: 'EMAILLISTVERIFY_API_KEY',
      description: 'EmailListVerify API key',
      validation: (val) => !val || val.length > 20,
      whatBreaks: 'Email verification via EmailListVerify',
      fallback: 'Uses alternative email verification or skips'
    },
    {
      name: 'EMAIL_API_KEY',
      description: 'SendGrid email API key',
      validation: (val) => !val || val.length > 20,
      whatBreaks: 'SendGrid email sending',
      fallback: 'Uses Resend or other email provider'
    },
    {
      name: 'NODE_ENV',
      description: 'Node environment (development/production)',
      validation: (val) => !val || ['development', 'production', 'test'].includes(val),
      whatBreaks: 'Environment-specific features, debug mode',
      fallback: 'Defaults to development'
    }
  ]
}

function validateEnvironment() {
  console.log(`${colors.bold}${colors.cyan}🔍 CloudGreet Environment Variables Validation${colors.reset}\n`)

  const results = {
    critical: { passed: 0, failed: 0, missing: [] },
    required: { passed: 0, failed: 0, missing: [] },
    optional: { passed: 0, failed: 0, missing: [], warnings: [] }
  }

  // Validate CRITICAL variables
  console.log(`${colors.bold}${colors.red}⚡ CRITICAL VARIABLES${colors.reset}`)
  console.log('─'.repeat(70))
  for (const envVar of envVarDefinitions.CRITICAL) {
    const value = process.env[envVar.name]
    const isValid = value && envVar.validation(value)
    
    if (isValid) {
      console.log(`${colors.green}✓${colors.reset} ${envVar.name.padEnd(35)} ${colors.green}OK${colors.reset}`)
      results.critical.passed++
    } else {
      console.log(`${colors.red}✗${colors.reset} ${envVar.name.padEnd(35)} ${colors.red}MISSING/INVALID${colors.reset}`)
      console.log(`   ${colors.yellow}Breaks:${colors.reset} ${envVar.whatBreaks}`)
      results.critical.failed++
      results.critical.missing.push(envVar.name)
    }
  }
  console.log()

  // Validate REQUIRED variables
  console.log(`${colors.bold}${colors.yellow}📋 REQUIRED VARIABLES${colors.reset}`)
  console.log('─'.repeat(70))
  for (const envVar of envVarDefinitions.REQUIRED) {
    const value = process.env[envVar.name] || (envVar.altNames && envVar.altNames.map(n => process.env[n]).find(v => v))
    const isValid = value && envVar.validation(value)
    
    if (isValid) {
      console.log(`${colors.green}✓${colors.reset} ${envVar.name.padEnd(35)} ${colors.green}OK${colors.reset}`)
      results.required.passed++
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} ${envVar.name.padEnd(35)} ${colors.yellow}MISSING/INVALID${colors.reset}`)
      console.log(`   ${colors.yellow}Breaks:${colors.reset} ${envVar.whatBreaks}`)
      results.required.failed++
      results.required.missing.push(envVar.name)
    }
  }
  console.log()

  // Validate OPTIONAL variables
  console.log(`${colors.bold}${colors.blue}📦 OPTIONAL VARIABLES${colors.reset}`)
  console.log('─'.repeat(70))
  for (const envVar of envVarDefinitions.OPTIONAL) {
    const value = process.env[envVar.name] || (envVar.altNames && envVar.altNames.map(n => process.env[n]).find(v => v))
    const isValid = !value || envVar.validation(value)
    
    if (!value) {
      console.log(`${colors.cyan}○${colors.reset} ${envVar.name.padEnd(35)} ${colors.cyan}NOT SET${colors.reset}`)
      if (envVar.fallback) {
        console.log(`   ${colors.cyan}Fallback:${colors.reset} ${envVar.fallback}`)
      }
      results.optional.missing.push(envVar.name)
    } else if (isValid) {
      console.log(`${colors.green}✓${colors.reset} ${envVar.name.padEnd(35)} ${colors.green}OK${colors.reset}`)
      results.optional.passed++
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} ${envVar.name.padEnd(35)} ${colors.yellow}INVALID FORMAT${colors.reset}`)
      if (envVar.fallback) {
        console.log(`   ${colors.cyan}Fallback:${colors.reset} ${envVar.fallback}`)
      }
      results.optional.failed++
      results.optional.warnings.push(envVar.name)
    }
  }
  console.log()

  // Summary
  console.log(`${colors.bold}${colors.cyan}📊 SUMMARY${colors.reset}`)
  console.log('─'.repeat(70))
  const totalCritical = envVarDefinitions.CRITICAL.length
  const totalRequired = envVarDefinitions.REQUIRED.length
  const totalOptional = envVarDefinitions.OPTIONAL.length

  console.log(`Critical: ${colors.green}${results.critical.passed}/${totalCritical}${colors.reset} passed, ${colors.red}${results.critical.failed}${colors.reset} failed`)
  console.log(`Required: ${colors.green}${results.required.passed}/${totalRequired}${colors.reset} passed, ${colors.yellow}${results.required.failed}${colors.reset} missing`)
  console.log(`Optional: ${colors.green}${results.optional.passed}${colors.reset} set, ${colors.cyan}${results.optional.missing.length}${colors.reset} not set, ${colors.yellow}${results.optional.failed}${colors.reset} invalid`)

  // Exit code
  if (results.critical.failed > 0) {
    console.log(`\n${colors.red}${colors.bold}❌ CRITICAL VARIABLES MISSING - PLATFORM WILL NOT WORK${colors.reset}`)
    console.log(`\nMissing: ${results.critical.missing.join(', ')}`)
    return 1
  }

  if (results.required.failed > 0) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  REQUIRED VARIABLES MISSING - CORE FEATURES WILL NOT WORK${colors.reset}`)
    console.log(`\nMissing: ${results.required.missing.join(', ')}`)
    return 1
  }

  console.log(`\n${colors.green}${colors.bold}✅ All critical and required variables are set!${colors.reset}`)
  if (results.optional.missing.length > 0) {
    console.log(`${colors.cyan}💡 Tip: Consider setting optional variables for enhanced features${colors.reset}`)
  }

  return 0
}

// Run validation
if (require.main === module) {
  // Load .env.local if it exists
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8')
      envFile.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^["']|["']$/g, '')
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      })
    }
  } catch (error) {
    // Ignore errors loading .env.local
  }

  const exitCode = validateEnvironment()
  process.exit(exitCode)
}

module.exports = { validateEnvironment, envVarDefinitions }

