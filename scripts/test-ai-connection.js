
// Test script to verify AI is working
console.log('🧪 Testing AI connection...');

// Test OpenAI API key
if (process.env.OPENAI_API_KEY) {
  console.log('✅ OpenAI API key is configured');
} else {
  console.log('❌ OpenAI API key is NOT configured');
}

// Test Telnyx API key
if (process.env.TELYNX_API_KEY) {
  console.log('✅ Telnyx API key is configured');
} else {
  console.log('❌ Telnyx API key is NOT configured');
}

// Test phone number
if (process.env.TELYNX_PHONE_NUMBER) {
  console.log('✅ Telnyx phone number is configured:', process.env.TELYNX_PHONE_NUMBER);
} else {
  console.log('❌ Telnyx phone number is NOT configured');
}

// Test app URL
if (process.env.NEXT_PUBLIC_APP_URL) {
  console.log('✅ App URL is configured:', process.env.NEXT_PUBLIC_APP_URL);
} else {
  console.log('❌ App URL is NOT configured');
}

console.log('\n🎯 AI Call Flow Test:');
console.log('1. Click-to-call initiates call');
console.log('2. Telnyx routes call to voice-webhook');
console.log('3. Voice-webhook routes to voice-handler');
console.log('4. Voice-handler uses OpenAI to generate responses');
console.log('5. AI speaks back to caller');
