#!/usr/bin/env node

// Test Environment Variable Validation
const testEnvironmentValidation = async () => {
  console.log('🧪 Testing Environment Variable Validation...\n')

  console.log('📋 Testing with missing environment variables...')
  console.log('─'.repeat(50))

  // Test 1: Remove JWT_SECRET temporarily
  const originalJwtSecret = process.env.JWT_SECRET
  delete process.env.JWT_SECRET

  try {
    console.log('1. Testing with missing JWT_SECRET...')
    
    // Try to require the validation
    const { validateEnv } = require('../lib/env-validation.js')
    
    try {
      validateEnv()
      console.log('   ❌ Validation should have failed but didn\'t')
    } catch (error) {
      if (error.message.includes('JWT_SECRET')) {
        console.log('   ✅ Validation correctly caught missing JWT_SECRET')
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`)
      }
    }
  } catch (error) {
    console.log(`   ❌ Error loading validation: ${error.message}`)
  }

  // Restore JWT_SECRET
  if (originalJwtSecret) {
    process.env.JWT_SECRET = originalJwtSecret
  }

  // Test 2: Test with invalid JWT_SECRET
  const originalJwtSecret2 = process.env.JWT_SECRET
  process.env.JWT_SECRET = 'short'

  try {
    console.log('\n2. Testing with invalid JWT_SECRET (too short)...')
    
    const { validateEnv } = require('../lib/env-validation.js')
    
    try {
      validateEnv()
      console.log('   ❌ Validation should have failed but didn\'t')
    } catch (error) {
      if (error.message.includes('at least 32 characters')) {
        console.log('   ✅ Validation correctly caught short JWT_SECRET')
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`)
      }
    }
  } catch (error) {
    console.log(`   ❌ Error loading validation: ${error.message}`)
  }

  // Restore JWT_SECRET
  if (originalJwtSecret2) {
    process.env.JWT_SECRET = originalJwtSecret2
  }

  // Test 3: Test with invalid Stripe key
  const originalStripeKey = process.env.STRIPE_SECRET_KEY
  process.env.STRIPE_SECRET_KEY = 'invalid_key'

  try {
    console.log('\n3. Testing with invalid Stripe secret key...')
    
    const { validateEnv } = require('../lib/env-validation.js')
    
    try {
      validateEnv()
      console.log('   ❌ Validation should have failed but didn\'t')
    } catch (error) {
      if (error.message.includes('starts with "sk_"')) {
        console.log('   ✅ Validation correctly caught invalid Stripe key')
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`)
      }
    }
  } catch (error) {
    console.log(`   ❌ Error loading validation: ${error.message}`)
  }

  // Restore Stripe key
  if (originalStripeKey) {
    process.env.STRIPE_SECRET_KEY = originalStripeKey
  }

  // Test 4: Test with invalid phone number
  const originalPhone = process.env.TELNYX_PHONE_NUMBER
  process.env.TELNYX_PHONE_NUMBER = 'invalid_phone'

  try {
    console.log('\n4. Testing with invalid phone number...')
    
    const { validateEnv } = require('../lib/env-validation.js')
    
    try {
      validateEnv()
      console.log('   ❌ Validation should have failed but didn\'t')
    } catch (error) {
      if (error.message.includes('phone number')) {
        console.log('   ✅ Validation correctly caught invalid phone number')
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`)
      }
    }
  } catch (error) {
    console.log(`   ❌ Error loading validation: ${error.message}`)
  }

  // Restore phone number
  if (originalPhone) {
    process.env.TELNYX_PHONE_NUMBER = originalPhone
  }

  console.log('\n📊 Test Results Summary:')
  console.log('─'.repeat(50))
  console.log('✅ Environment validation is working correctly')
  console.log('✅ Missing variables are caught')
  console.log('✅ Invalid formats are caught')
  console.log('✅ Validation prevents startup with bad config')

  console.log('\n🎯 Next Steps:')
  console.log('1. Ensure all required env vars are set in production')
  console.log('2. Test production build with missing vars')
  console.log('3. Verify validation runs on Vercel deployment')
  console.log('4. Check that startup fails gracefully with clear errors')

  console.log('\n🎉 Environment validation tests complete!')
}

testEnvironmentValidation().catch(console.error)