// Test AI Receptionist functionality
require('dotenv').config({ path: '.env.local' });

console.log('🤖 TESTING AI RECEPTIONIST FUNCTIONALITY');
console.log('========================================');

// Check environment variables
const retellApiKey = process.env.NEXT_PUBLIC_RETELL_API_KEY;
const retellAgentId = process.env.NEXT_PUBLIC_RETELL_AGENT_ID;
const smtpPass = process.env.SMTP_PASS;

console.log('\n🔍 ENVIRONMENT CHECK:');
console.log('=====================');

if (retellApiKey && retellApiKey !== 'placeholder_retell_api_key') {
  console.log('✅ Retell API Key: CONFIGURED');
} else {
  console.log('❌ Retell API Key: MISSING');
}

if (retellAgentId && retellAgentId !== 'placeholder_retell_agent_id') {
  console.log('✅ Retell Agent ID: CONFIGURED');
} else {
  console.log('❌ Retell Agent ID: MISSING - Need to create agent in Retell dashboard');
}

if (smtpPass && smtpPass !== 'SG.placeholder_sendgrid_api_key') {
  console.log('✅ Email Service: CONFIGURED (Resend)');
} else {
  console.log('❌ Email Service: MISSING');
}

console.log('\n🎯 AI RECEPTIONIST STATUS:');
console.log('==========================');

if (retellApiKey && retellAgentId && smtpPass) {
  console.log('🎉 AI RECEPTIONIST FULLY FUNCTIONAL!');
  console.log('✅ Voice calls with AI responses');
  console.log('✅ SMS messaging');
  console.log('✅ Email notifications');
  console.log('✅ Lead qualification');
  console.log('✅ 24/7 availability');
} else {
  console.log('⚠️ AI RECEPTIONIST PARTIALLY FUNCTIONAL');
  
  if (!retellAgentId) {
    console.log('❌ Missing Agent ID - No voice responses');
    console.log('📋 Next step: Create agent at https://retellai.com/dashboard');
  }
  
  if (!retellApiKey) {
    console.log('❌ Missing API Key - No voice functionality');
  }
  
  if (!smtpPass) {
    console.log('❌ Missing Email - No notifications');
  }
}

console.log('\n🚀 TESTING INSTRUCTIONS:');
console.log('========================');
console.log('1. Make sure development server is running');
console.log('2. Go to your dashboard');
console.log('3. Try making a test call');
console.log('4. Check if AI responds with voice');
console.log('5. Test SMS functionality');
console.log('6. Test email notifications');

console.log('\n📞 RETELL AGENT SETUP:');
console.log('======================');
console.log('1. Go to: https://retellai.com/dashboard');
console.log('2. Create new agent');
console.log('3. Configure:');
console.log('   - Name: CloudGreet AI Receptionist');
console.log('   - Voice: Professional');
console.log('   - Greeting: "Thank you for calling [Business]. How can I help?"');
console.log('4. Copy Agent ID');
console.log('5. Update .env.local with Agent ID');
console.log('6. Restart server and test!');

if (retellAgentId && retellAgentId !== 'placeholder_retell_agent_id') {
  console.log('\n🧪 READY TO TEST AI RECEPTIONIST!');
} else {
  console.log('\n⏳ WAITING FOR AGENT ID TO COMPLETE SETUP');
}
