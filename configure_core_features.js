// Configure core AI receptionist features
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

console.log('🔧 CONFIGURING CORE AI RECEPTIONIST FEATURES');
console.log('=============================================');

// Read current .env.local
let envContent = fs.readFileSync('.env.local', 'utf8');

// Core features that need real configuration
const coreFeatures = {
  // Retell AI (Voice Agent) - CRITICAL for AI receptionist
  'NEXT_PUBLIC_RETELL_API_KEY': {
    description: 'Retell AI API Key for voice agent',
    placeholder: 'placeholder_retell_api_key',
    required: true,
    critical: true
  },
  'NEXT_PUBLIC_RETELL_AGENT_ID': {
    description: 'Retell AI Agent ID for voice responses',
    placeholder: 'placeholder_retell_agent_id', 
    required: true,
    critical: true
  },
  
  // Email (SMTP) - CRITICAL for notifications
  'SMTP_PASS': {
    description: 'SMTP Password for email sending',
    placeholder: 'SG.placeholder_sendgrid_api_key',
    required: true,
    critical: true
  },
  
  // Google Calendar - CRITICAL for appointment booking
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID': {
    description: 'Google Calendar Client ID',
    placeholder: 'placeholder_google_client_id',
    required: true,
    critical: true
  },
  'GOOGLE_CLIENT_SECRET': {
    description: 'Google Calendar Client Secret',
    placeholder: 'placeholder_google_client_secret',
    required: true,
    critical: true
  },
  
  // Stripe Webhook - IMPORTANT for payment processing
  'STRIPE_WEBHOOK_SECRET': {
    description: 'Stripe Webhook Secret',
    placeholder: 'whsec_placeholder_webhook_secret',
    required: true,
    critical: false
  }
};

console.log('\n🚨 CRITICAL FEATURES MISSING:');
console.log('==============================');

let criticalIssues = 0;
let importantIssues = 0;

for (const [key, config] of Object.entries(coreFeatures)) {
  if (envContent.includes(config.placeholder)) {
    if (config.critical) {
      console.log(`❌ CRITICAL: ${key} - ${config.description}`);
      criticalIssues++;
    } else {
      console.log(`⚠️ IMPORTANT: ${key} - ${config.description}`);
      importantIssues++;
    }
  } else {
    console.log(`✅ CONFIGURED: ${key}`);
  }
}

console.log('\n📋 SETUP INSTRUCTIONS:');
console.log('======================');

if (criticalIssues > 0) {
  console.log('\n🚨 CRITICAL SETUP REQUIRED:');
  console.log('1. RETELL AI (Voice Agent):');
  console.log('   - Go to https://retellai.com');
  console.log('   - Create account and get API key');
  console.log('   - Create an AI agent and get Agent ID');
  console.log('   - Replace placeholders in .env.local');
  
  console.log('\n2. EMAIL (SMTP):');
  console.log('   - Go to https://sendgrid.com');
  console.log('   - Create account and get API key');
  console.log('   - Replace SMTP_PASS placeholder');
  
  console.log('\n3. GOOGLE CALENDAR:');
  console.log('   - Go to https://console.developers.google.com');
  console.log('   - Create project and enable Calendar API');
  console.log('   - Create OAuth credentials');
  console.log('   - Replace Google placeholders');
}

console.log('\n🎯 CURRENT STATUS:');
console.log(`❌ Critical Issues: ${criticalIssues}`);
console.log(`⚠️ Important Issues: ${importantIssues}`);

if (criticalIssues > 0) {
  console.log('\n🚨 AI RECEPTIONIST NOT FUNCTIONAL');
  console.log('Without these configurations:');
  console.log('- No voice agent (no AI receptionist)');
  console.log('- No email notifications');
  console.log('- No calendar booking');
  console.log('- Limited payment processing');
} else {
  console.log('\n✅ ALL CORE FEATURES CONFIGURED');
  console.log('AI receptionist fully functional!');
}
