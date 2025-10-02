// Add missing environment variables to .env.local
const fs = require('fs');

const missingVars = `
# STRIPE WEBHOOK
STRIPE_WEBHOOK_SECRET=whsec_placeholder_webhook_secret

# EMAIL (SMTP) - CONFIGURED FOR PRODUCTION
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.placeholder_sendgrid_api_key
SMTP_FROM_EMAIL=noreply@cloudgreet.com

# ADMIN ACCESS
ADMIN_PASSWORD=1487

# RETELL AI (VOICE AGENT)
NEXT_PUBLIC_RETELL_API_KEY=placeholder_retell_api_key
NEXT_PUBLIC_RETELL_AGENT_ID=placeholder_retell_agent_id

# GOOGLE CALENDAR INTEGRATION
NEXT_PUBLIC_GOOGLE_CLIENT_ID=placeholder_google_client_id
GOOGLE_CLIENT_SECRET=placeholder_google_client_secret
GOOGLE_REDIRECT_URI=https://cloudgreet.com/api/calendar/callback
`;

try {
  // Read current .env.local
  let envContent = fs.readFileSync('.env.local', 'utf8');
  
  // Add missing variables if they don't exist
  if (!envContent.includes('STRIPE_WEBHOOK_SECRET')) {
    envContent += missingVars;
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Added missing environment variables to .env.local');
  } else {
    console.log('✅ Environment variables already exist');
  }
} catch (error) {
  console.error('❌ Error updating .env.local:', error.message);
}
