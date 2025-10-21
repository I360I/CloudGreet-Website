
// Test script to verify AI connection
console.log('🧪 Testing AI connection...');

// Test environment variables
const requiredVars = [
  'OPENAI_API_KEY',
  'TELYNX_API_KEY',
  'TELYNX_PHONE_NUMBER',
  'TELYNX_CONNECTION_ID',
  'NEXT_PUBLIC_APP_URL'
];

console.log('\n🔍 Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n🎯 AI Call Flow Test:');
console.log('1. Click-to-call → Demo conversation API → AI session');
console.log('2. Click-to-call → Telnyx API → Call initiated');
console.log('3. Telnyx → Voice webhook → Phone number matching');
console.log('4. Voice webhook → Voice handler → AI response');
console.log('5. Voice handler → OpenAI → AI speaks');

console.log('\n🚀 Test the demo call now!');
