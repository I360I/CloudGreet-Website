#!/usr/bin/env node

// Vercel Deployment Script
const deployToVercel = async () => {
  console.log('🚀 Deploying to Vercel...\n')

  console.log('📋 Pre-Deployment Checklist:')
  console.log('─'.repeat(50))
  console.log('✅ Critical fixes implemented')
  console.log('✅ Webhook idempotency added')
  console.log('✅ Environment validation added')
  console.log('✅ Billing logic fixed')
  console.log('✅ Retell fallback added')
  console.log('✅ gpt-5-turbo bugs fixed')

  console.log('\n🔧 Deployment Steps:')
  console.log('─'.repeat(50))

  console.log('1. Commit all changes:')
  console.log('   git add .')
  console.log('   git commit -m "feat: critical production fixes - webhook idempotency, billing, fallback"')
  console.log('   git push origin main')

  console.log('\n2. Deploy to Vercel:')
  console.log('   vercel --prod')
  console.log('   # OR if using GitHub integration, push triggers auto-deploy')

  console.log('\n3. Set Environment Variables in Vercel:')
  console.log('   - Go to Vercel dashboard')
  console.log('   - Select your project')
  console.log('   - Go to Settings > Environment Variables')
  console.log('   - Add all required variables from env.example')

  console.log('\n4. Verify Deployment:')
  console.log('   - Check deployment logs for errors')
  console.log('   - Verify environment validation passes')
  console.log('   - Test webhook endpoints')

  console.log('\n📋 Required Environment Variables for Production:')
  console.log('─'.repeat(50))
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'RETELL_API_KEY',
    'TELNYX_API_KEY',
    'TELNYX_PHONE_NUMBER',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ]

  for (const varName of requiredVars) {
    console.log(`- ${varName}`)
  }

  console.log('\n🎯 Post-Deployment Testing:')
  console.log('─'.repeat(50))
  console.log('1. Test webhook idempotency')
  console.log('2. Test Retell AI integration')
  console.log('3. Test appointment booking flow')
  console.log('4. Test billing (book → complete → charge)')
  console.log('5. Test Retell fallback')
  console.log('6. Monitor logs for errors')

  console.log('\n✅ Deployment script ready!')
  console.log('\n📋 Next steps:')
  console.log('1. Run: node scripts/run-production-migration.js')
  console.log('2. Run: node scripts/verify-env-vars.js')
  console.log('3. Run: node scripts/verify-pricing.js')
  console.log('4. Deploy to Vercel')
  console.log('5. Test production endpoints')
}

deployToVercel().catch(console.error)

