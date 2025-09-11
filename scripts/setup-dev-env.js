// Development Environment Setup Script
const fs = require('fs');
const path = require('path');

const envContent = `# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key-change-in-production

# Supabase Configuration (Replace with your actual values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/cloudgreet

# Stripe Configuration (Replace with your actual values)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Retell AI Configuration (Replace with your actual values)
RETELL_API_KEY=your_retell_api_key

# Azure Communication Services (Replace with your actual values)
AZURE_COMMUNICATION_CONNECTION_STRING=your_azure_connection_string

# Email Configuration (Replace with your actual values)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Development Mode
NODE_ENV=development`;

const envPath = path.join(process.cwd(), '.env.local');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file with development configuration');
  console.log('⚠️  Please update the placeholder values with your actual API keys');
} catch (error) {
  console.error('❌ Error creating .env.local:', error.message);
  console.log('📝 Please manually create .env.local with the following content:');
  console.log(envContent);
}
