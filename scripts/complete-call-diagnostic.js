const fs = require('fs');
const path = require('path');

console.log('🔍 COMPLETE CALL DIAGNOSTIC - Finding the exact issue...\n');

// 1. Test the demo conversation API
async function testDemoConversationAPI() {
  console.log('📋 Testing Demo Conversation API...');
  
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  if (!fs.existsSync(apiPath)) {
    console.log('  ❌ Demo conversation API does not exist');
    return false;
  }
  
  const content = fs.readFileSync(apiPath, 'utf8');
  
  // Check if it has proper OpenAI integration
  if (!content.includes('openai.chat.completions.create') && !content.includes('OpenAI')) {
    console.log('  ❌ Demo conversation API does not use OpenAI');
    return false;
  }
  
  if (!content.includes('OPENAI_API_KEY')) {
    console.log('  ❌ Demo conversation API does not check for OpenAI API key');
    return false;
  }
  
  if (!content.includes('sessionId')) {
    console.log('  ❌ Demo conversation API does not return session ID');
    return false;
  }
  
  console.log('  ✅ Demo conversation API looks correct');
  return true;
}

// 2. Test the click-to-call API
async function testClickToCallAPI() {
  console.log('📋 Testing Click-to-Call API...');
  
  const apiPath = 'app/api/click-to-call/initiate/route.ts';
  if (!fs.existsSync(apiPath)) {
    console.log('  ❌ Click-to-call API does not exist');
    return false;
  }
  
  const content = fs.readFileSync(apiPath, 'utf8');
  
  // Check if it calls the demo conversation API
  if (!content.includes('conversation-demo')) {
    console.log('  ❌ Click-to-call does not call demo conversation API');
    return false;
  }
  
  // Check if it creates Telnyx calls
  if (!content.includes('api.telnyx.com/v2/calls')) {
    console.log('  ❌ Click-to-call does not create Telnyx calls');
    return false;
  }
  
  // Check if it uses the correct webhook URL
  if (!content.includes('voice-webhook')) {
    console.log('  ❌ Click-to-call does not use voice-webhook');
    return false;
  }
  
  // Check if it uses the correct environment variable
  if (!content.includes('NEXT_PUBLIC_APP_URL')) {
    console.log('  ❌ Click-to-call does not use NEXT_PUBLIC_APP_URL');
    return false;
  }
  
  console.log('  ✅ Click-to-call API looks correct');
  return true;
}

// 3. Test the voice webhook
async function testVoiceWebhook() {
  console.log('📋 Testing Voice Webhook...');
  
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (!fs.existsSync(webhookPath)) {
    console.log('  ❌ Voice webhook does not exist');
    return false;
  }
  
  const content = fs.readFileSync(webhookPath, 'utf8');
  
  // Check if it routes to voice-handler
  if (!content.includes('voice-handler')) {
    console.log('  ❌ Voice webhook does not route to voice-handler');
    return false;
  }
  
  // Check if it uses the correct environment variable
  if (!content.includes('NEXT_PUBLIC_APP_URL')) {
    console.log('  ❌ Voice webhook does not use NEXT_PUBLIC_APP_URL');
    return false;
  }
  
  // Check if it's configured for speech gathering
  if (!content.includes('gather') || !content.includes('speech')) {
    console.log('  ❌ Voice webhook not configured for speech gathering');
    return false;
  }
  
  // Check if it checks for the Telnyx phone number
  if (!content.includes('TELYNX_PHONE_NUMBER')) {
    console.log('  ❌ Voice webhook does not check for TELYNX_PHONE_NUMBER');
    return false;
  }
  
  console.log('  ✅ Voice webhook looks correct');
  return true;
}

// 4. Test the voice handler
async function testVoiceHandler() {
  console.log('📋 Testing Voice Handler...');
  
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (!fs.existsSync(handlerPath)) {
    console.log('  ❌ Voice handler does not exist');
    return false;
  }
  
  const content = fs.readFileSync(handlerPath, 'utf8');
  
  // Check if it uses OpenAI
  if (!content.includes('openai.chat.completions.create')) {
    console.log('  ❌ Voice handler does not use OpenAI');
    return false;
  }
  
  // Check if it generates AI responses
  if (!content.includes('aiResponse')) {
    console.log('  ❌ Voice handler does not generate AI responses');
    return false;
  }
  
  // Check if it's configured for speech gathering
  if (!content.includes('gather') || !content.includes('speech')) {
    console.log('  ❌ Voice handler not configured for speech gathering');
    return false;
  }
  
  // Check if it uses the correct model
  if (!content.includes('gpt-4')) {
    console.log('  ❌ Voice handler does not use GPT-4');
    return false;
  }
  
  console.log('  ✅ Voice handler looks correct');
  return true;
}

// 5. Check for critical issues
async function checkCriticalIssues() {
  console.log('📋 Checking for Critical Issues...');
  
  const issues = [];
  
  // Check if the demo conversation API is properly implemented
  const demoApiPath = 'app/api/ai/conversation-demo/route.ts';
  if (fs.existsSync(demoApiPath)) {
    const content = fs.readFileSync(demoApiPath, 'utf8');
    
    if (!content.includes('OPENAI_API_KEY') || !content.includes('OpenAI')) {
      issues.push('Demo conversation API not properly implemented');
    }
  } else {
    issues.push('Demo conversation API missing');
  }
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    if (!content.includes('TELYNX_PHONE_NUMBER') || !content.includes('telnyxPhoneNumber')) {
      issues.push('Voice webhook not properly configured for phone number matching');
    }
    
    if (!content.includes('NEXT_PUBLIC_APP_URL')) {
      issues.push('Voice webhook not using NEXT_PUBLIC_APP_URL');
    }
  } else {
    issues.push('Voice webhook missing');
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (!content.includes('openai.chat.completions.create') || !content.includes('aiResponse')) {
      issues.push('Voice handler not properly configured for AI responses');
    }
  } else {
    issues.push('Voice handler missing');
  }
  
  if (issues.length > 0) {
    console.log('  ❌ Critical issues found:');
    issues.forEach(issue => console.log(`    - ${issue}`));
    return false;
  } else {
    console.log('  ✅ No critical issues found');
    return true;
  }
}

// 6. Check the actual call flow
async function checkCallFlow() {
  console.log('📋 Checking Call Flow...');
  
  // Check if the click-to-call is properly configured
  const clickToCallPath = 'app/api/click-to-call/initiate/route.ts';
  if (fs.existsSync(clickToCallPath)) {
    const content = fs.readFileSync(clickToCallPath, 'utf8');
    
    // Check if it's using the correct webhook URL
    if (!content.includes('voice-webhook')) {
      console.log('  ❌ Click-to-call does not use voice-webhook');
      return false;
    }
    
    // Check if it's using the correct environment variable
    if (!content.includes('NEXT_PUBLIC_APP_URL')) {
      console.log('  ❌ Click-to-call does not use NEXT_PUBLIC_APP_URL');
      return false;
    }
    
    // Check if it's creating Telnyx calls
    if (!content.includes('api.telnyx.com/v2/calls')) {
      console.log('  ❌ Click-to-call does not create Telnyx calls');
      return false;
    }
  }
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the correct environment variable
    if (!content.includes('NEXT_PUBLIC_APP_URL')) {
      console.log('  ❌ Voice webhook does not use NEXT_PUBLIC_APP_URL');
      return false;
    }
    
    // Check if it's routing to voice-handler
    if (!content.includes('voice-handler')) {
      console.log('  ❌ Voice webhook does not route to voice-handler');
      return false;
    }
  }
  
  console.log('  ✅ Call flow looks correct');
  return true;
}

// 7. Create a test script to verify the AI connection
async function createAITestScript() {
  const testScript = `
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

console.log('\\n🔍 Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(\`✅ \${varName}: \${value.substring(0, 10)}...\`);
  } else {
    console.log(\`❌ \${varName}: NOT SET\`);
  }
});

console.log('\\n🎯 AI Call Flow Test:');
console.log('1. Click-to-call → Demo conversation API → AI session');
console.log('2. Click-to-call → Telnyx API → Call initiated');
console.log('3. Telnyx → Voice webhook → Phone number matching');
console.log('4. Voice webhook → Voice handler → AI response');
console.log('5. Voice handler → OpenAI → AI speaks');

console.log('\\n🚀 Test the demo call now!');
`;

  fs.writeFileSync('scripts/ai-connection-test.js', testScript);
  console.log('✅ Created AI connection test script');
}

// Run all tests
async function runDiagnostic() {
  console.log('🔧 Running complete call diagnostic...\n');
  
  const results = {
    demoConversationAPI: await testDemoConversationAPI(),
    clickToCallAPI: await testClickToCallAPI(),
    voiceWebhook: await testVoiceWebhook(),
    voiceHandler: await testVoiceHandler(),
    criticalIssues: await checkCriticalIssues(),
    callFlow: await checkCallFlow()
  };
  
  console.log('\n📋 DIAGNOSTIC RESULTS:');
  console.log(`Demo Conversation API: ${results.demoConversationAPI ? '✅' : '❌'}`);
  console.log(`Click-to-Call API: ${results.clickToCallAPI ? '✅' : '❌'}`);
  console.log(`Voice Webhook: ${results.voiceWebhook ? '✅' : '❌'}`);
  console.log(`Voice Handler: ${results.voiceHandler ? '✅' : '❌'}`);
  console.log(`Critical Issues: ${results.criticalIssues ? '✅' : '❌'}`);
  console.log(`Call Flow: ${results.callFlow ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED - The AI should be working!');
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test the demo call functionality');
    console.log('2. Check Vercel logs for any errors');
    console.log('3. Verify that the AI is actually speaking during calls');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Issues found:');
    console.log('\n🚀 IMMEDIATE ACTION REQUIRED:');
    console.log('1. Fix the failing components');
    console.log('2. Check Vercel logs for any errors');
    console.log('3. Verify environment variables are set correctly');
    console.log('4. Test the voice webhook endpoint directly');
    console.log('5. Check if the voice handler is being called');
  }
  
  await createAITestScript();
}

runDiagnostic().catch(console.error);
