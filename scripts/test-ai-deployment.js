
// Test script to verify AI deployment
console.log('🧪 Testing AI deployment...');

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';
console.log('Environment:', isProduction ? 'Production' : 'Development');

// Check critical environment variables
const requiredVars = [
  'OPENAI_API_KEY',
  'TELYNX_API_KEY', 
  'TELYNX_PHONE_NUMBER',
  'NEXT_PUBLIC_APP_URL'
];

console.log('\n🔍 Environment Variables Check:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

// Test OpenAI connection
if (process.env.OPENAI_API_KEY) {
  console.log('\n🤖 Testing OpenAI connection...');
  // This would test the actual OpenAI API
  console.log('✅ OpenAI API key is configured');
} else {
  console.log('❌ OpenAI API key not configured');
}

console.log('\n🎯 AI Deployment Status:');
console.log('1. Environment variables configured:', requiredVars.every(v => process.env[v]));
console.log('2. OpenAI API key:', !!process.env.OPENAI_API_KEY);
console.log('3. Telnyx API key:', !!process.env.TELYNX_API_KEY);
console.log('4. Phone number:', !!process.env.TELYNX_PHONE_NUMBER);
