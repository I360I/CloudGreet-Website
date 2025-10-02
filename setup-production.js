#!/usr/bin/env node

/**
 * CloudGreet Production Setup Script
 * Helps set up environment variables and test the configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 CLOUDGREET PRODUCTION SETUP');
console.log('===============================\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local file...');
  
  const envTemplate = `# CloudGreet Production Environment Variables
# Copy this file to .env.local and replace placeholder values with your actual credentials

# ========================================
# SUPABASE DATABASE CONFIGURATION
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ========================================
# STRIPE PAYMENT PROCESSING
# ========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key-here
STRIPE_SECRET_KEY=sk_test_your-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# ========================================
# TELYNYX VOICE & SMS
# ========================================
TELYNYX_API_KEY=your-telynyx-api-key-here
TELYNYX_MESSAGING_PROFILE_ID=your-messaging-profile-id-here
TELYNYX_VOICE_APPLICATION_ID=your-voice-application-id-here

# ========================================
# OPENAI AI PROCESSING
# ========================================
OPENAI_API_KEY=sk-your-openai-api-key-here

# ========================================
# GOOGLE CALENDAR INTEGRATION
# ========================================
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/callback

# ========================================
# EMAIL CONFIGURATION
# ========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=CloudGreet

# ========================================
# JWT SECURITY
# ========================================
JWT_SECRET=your-super-secure-jwt-secret-key-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-domain.com

# ========================================
# APPLICATION CONFIGURATION
# ========================================
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# ========================================
# DEFAULT PASSWORDS (CHANGE IN PRODUCTION)
# ========================================
DEFAULT_PASSWORD=your-secure-default-password-here
ADMIN_PASSWORD=your-secure-admin-password-here
NEXT_PUBLIC_ADMIN_PASSWORD=your-secure-admin-password-here

# ========================================
# PHONE NUMBERS & CONTACT
# ========================================
NEXT_PUBLIC_SUPPORT_PHONE=+1-800-CLOUDGREET
NOTIFICATION_PHONE=+1-555-123-4567
HUMAN_TRANSFER_PHONE=+1-555-123-4567

# ========================================
# BILLING CONFIGURATION
# ========================================
MONTHLY_SUBSCRIPTION_FEE=299
PER_BOOKING_FEE=15
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local template file');
} else {
  console.log('✅ .env.local file already exists');
}

console.log('\n📋 SETUP CHECKLIST:');
console.log('===================');

const checklist = [
  {
    service: 'Supabase Database',
    url: 'https://supabase.com',
    description: 'Create project, get API keys, run database setup'
  },
  {
    service: 'Stripe Payments',
    url: 'https://stripe.com',
    description: 'Create account, get API keys, set up webhooks'
  },
  {
    service: 'Telynyx Voice/SMS',
    url: 'https://telynyx.com',
    description: 'Create account, get API key, purchase phone numbers'
  },
  {
    service: 'OpenAI AI',
    url: 'https://openai.com',
    description: 'Create account, get API key, set up billing'
  },
  {
    service: 'Google Calendar',
    url: 'https://console.cloud.google.com',
    description: 'Create project, enable Calendar API, create OAuth credentials'
  }
];

checklist.forEach((item, index) => {
  console.log(`${index + 1}. ${item.service}`);
  console.log(`   URL: ${item.url}`);
  console.log(`   Action: ${item.description}\n`);
});

console.log('📖 DETAILED INSTRUCTIONS:');
console.log('=========================');
console.log('Read ENVIRONMENT_VARIABLES_SETUP.md for complete step-by-step instructions.\n');

console.log('🧪 TESTING:');
console.log('===========');
console.log('After configuring environment variables, run:');
console.log('1. node test-env.js - Test environment variables');
console.log('2. npm run build - Test build');
console.log('3. npm run dev - Test development server');
console.log('4. vercel --prod - Deploy to production\n');

console.log('🎯 QUICK START:');
console.log('===============');
console.log('1. Edit .env.local with your actual credentials');
console.log('2. Run: node test-env.js');
console.log('3. Run: npm run build');
console.log('4. Run: vercel --prod');
console.log('5. Start onboarding customers!\n');

console.log('🚀 Your CloudGreet platform will be 100% production-ready once configured!');
