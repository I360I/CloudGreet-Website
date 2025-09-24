#!/usr/bin/env node

/**
 * Environment Variables Test Script
 * Tests all required environment variables for CloudGreet
 */

const requiredEnvVars = [
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  
  // Stripe
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  
  // Telynyx
  'TELYNYX_API_KEY',
  'TELYNYX_MESSAGING_PROFILE_ID',
  
  // OpenAI
  'OPENAI_API_KEY',
  
  // Google Calendar
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  
  // Security
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
  
  // Application
  'NEXT_PUBLIC_BASE_URL',
  'NODE_ENV'
];

const optionalEnvVars = [
  // Email
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  
  // Phone Numbers
  'NEXT_PUBLIC_SUPPORT_PHONE',
  'NOTIFICATION_PHONE',
  
  // Billing
  'MONTHLY_SUBSCRIPTION_FEE',
  'PER_BOOKING_FEE',
  
  // Default Passwords
  'DEFAULT_PASSWORD',
  'ADMIN_PASSWORD'
];

console.log('🔍 CLOUDGREET ENVIRONMENT VARIABLES TEST');
console.log('==========================================\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

let requiredMissing = 0;
let optionalMissing = 0;

console.log('📋 REQUIRED ENVIRONMENT VARIABLES:');
console.log('-----------------------------------');

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value && value.trim() !== '') {
    // Mask sensitive values
    const maskedValue = envVar.includes('SECRET') || envVar.includes('KEY') || envVar.includes('PASSWORD')
      ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`✅ ${envVar}: ${maskedValue}`);
  } else {
    console.log(`❌ ${envVar}: MISSING`);
    requiredMissing++;
  }
});

console.log('\n📋 OPTIONAL ENVIRONMENT VARIABLES:');
console.log('-----------------------------------');

optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value && value.trim() !== '') {
    const maskedValue = envVar.includes('SECRET') || envVar.includes('KEY') || envVar.includes('PASSWORD')
      ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`✅ ${envVar}: ${maskedValue}`);
  } else {
    console.log(`⚠️  ${envVar}: Not set (using defaults)`);
    optionalMissing++;
  }
});

console.log('\n📊 SUMMARY:');
console.log('============');

if (requiredMissing === 0) {
  console.log('🎉 All required environment variables are configured!');
  console.log('✅ Your CloudGreet platform is ready for production deployment.');
  
  if (optionalMissing > 0) {
    console.log(`⚠️  ${optionalMissing} optional variables are not set (using defaults).`);
  }
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Run: npm run build');
  console.log('2. Run: vercel --prod');
  console.log('3. Test your deployed application');
  console.log('4. Start onboarding customers!');
  
} else {
  console.log(`❌ ${requiredMissing} required environment variables are missing.`);
  console.log('⚠️  Please configure them before deployment.');
  
  console.log('\n📖 SETUP GUIDE:');
  console.log('1. Read: ENVIRONMENT_VARIABLES_SETUP.md');
  console.log('2. Create accounts for required services');
  console.log('3. Add environment variables to .env.local');
  console.log('4. Run this test again');
}

console.log('\n💡 TIP: Copy the template from ENVIRONMENT_VARIABLES_SETUP.md');
console.log('   and replace placeholder values with your actual credentials.\n');
