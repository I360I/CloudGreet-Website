// test-env-in-app.js
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Environment Variables...');

const criticalVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'TELYNX_API_KEY',
  'OPENAI_API_KEY',
  'JWT_SECRET'
];

let allGood = true;

criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('placeholder') || value.includes('your-actual-')) {
    console.log(`❌ ${varName}: MISSING or PLACEHOLDER`);
    allGood = false;
  } else {
    console.log(`✅ ${varName}: SET`);
  }
});

if (allGood) {
  console.log('🎉 All environment variables are properly configured!');
} else {
  console.log('💥 Some environment variables are missing or are placeholders!');
  console.log('Please check your .env.local file.');
}
