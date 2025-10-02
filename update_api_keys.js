// Update API keys for AI receptionist functionality
const fs = require('fs');

console.log('🔧 UPDATING AI RECEPTIONIST API KEYS');
console.log('=====================================');

// Read current .env.local
let envContent = fs.readFileSync('.env.local', 'utf8');

// Update Retell AI key
const retellApiKey = 'key_25a81eef34c234074fdd2f577322';
const resendApiKey = 're_dPBFXcZz_CGxXqfb3kaeNDc8opeiydThn';

console.log('📝 Updating API keys...');

// Update Retell AI API Key
envContent = envContent.replace(
  'NEXT_PUBLIC_RETELL_API_KEY=placeholder_retell_api_key',
  `NEXT_PUBLIC_RETELL_API_KEY=${retellApiKey}`
);

// Update SMTP to use Resend instead of SendGrid
envContent = envContent.replace(
  'SMTP_HOST=smtp.sendgrid.net',
  'SMTP_HOST=smtp.resend.com'
);
envContent = envContent.replace(
  'SMTP_PORT=587',
  'SMTP_PORT=587'
);
envContent = envContent.replace(
  'SMTP_USER=apikey',
  'SMTP_USER=resend'
);
envContent = envContent.replace(
  'SMTP_PASS=SG.placeholder_sendgrid_api_key',
  `SMTP_PASS=${resendApiKey}`
);

// Write updated content
fs.writeFileSync('.env.local', envContent);

console.log('✅ Updated Retell AI API Key');
console.log('✅ Updated Email service to Resend');
console.log('✅ API keys configured successfully!');

console.log('\n🎯 REMAINING CONFIGURATION NEEDED:');
console.log('=====================================');
console.log('❌ NEXT_PUBLIC_RETELL_AGENT_ID - Need to create an AI agent in Retell');
console.log('❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID - For calendar integration');
console.log('❌ GOOGLE_CLIENT_SECRET - For calendar integration');
console.log('⚠️ STRIPE_WEBHOOK_SECRET - For payment webhooks');

console.log('\n🚀 NEXT STEPS:');
console.log('===============');
console.log('1. Create Retell AI Agent:');
console.log('   - Go to https://retellai.com/dashboard');
console.log('   - Create a new agent');
console.log('   - Copy the Agent ID');
console.log('   - Update NEXT_PUBLIC_RETELL_AGENT_ID in .env.local');

console.log('\n2. Test the AI receptionist:');
console.log('   - Restart the development server');
console.log('   - Test voice calls and SMS functionality');

console.log('\n✅ AI RECEPTIONIST STATUS:');
console.log('==========================');
console.log('✅ Voice API configured');
console.log('✅ Email sending configured');
console.log('⚠️ Need Agent ID for voice responses');
console.log('⚠️ Need Google Calendar for booking');
