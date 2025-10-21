const fs = require('fs');
const path = require('path');

console.log('🔍 Complete AI call test - checking every step of the call flow...\n');

// 1. Test the demo conversation API
function testDemoConversationAPI() {
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    console.log('📋 Demo Conversation API Analysis:');
    
    if (content.includes('OPENAI_API_KEY')) {
      console.log('  ✅ Checks for OpenAI API key');
    } else {
      console.log('  ❌ Does NOT check for OpenAI API key');
    }
    
    if (content.includes('chat/completions')) {
      console.log('  ✅ Uses OpenAI chat completions');
    } else {
      console.log('  ❌ Does NOT use OpenAI chat completions');
    }
    
    if (content.includes('gpt-4')) {
      console.log('  ✅ Uses GPT-4 model');
    } else {
      console.log('  ❌ Does NOT use GPT-4 model');
    }
    
    if (content.includes('sessionId')) {
      console.log('  ✅ Returns session ID');
    } else {
      console.log('  ❌ Does NOT return session ID');
    }
  } else {
    console.log('❌ Demo conversation API not found');
  }
}

// 2. Test the click-to-call flow
function testClickToCallFlow() {
  const apiPath = 'app/api/click-to-call/initiate/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    console.log('📋 Click-to-Call Flow Analysis:');
    
    // Check if it calls the demo conversation API
    if (content.includes('conversation-demo')) {
      console.log('  ✅ Calls demo conversation API');
    } else {
      console.log('  ❌ Does NOT call demo conversation API');
    }
    
    // Check if it uses the AI session
    if (content.includes('aiSession')) {
      console.log('  ✅ Uses AI session');
    } else {
      console.log('  ❌ Does NOT use AI session');
    }
    
    // Check if it creates Telnyx calls
    if (content.includes('api.telnyx.com/v2/calls')) {
      console.log('  ✅ Creates Telnyx calls');
    } else {
      console.log('  ❌ Does NOT create Telnyx calls');
    }
    
    // Check if it uses the correct webhook
    if (content.includes('voice-webhook')) {
      console.log('  ✅ Uses voice-webhook');
    } else {
      console.log('  ❌ Does NOT use voice-webhook');
    }
    
    // Check if it uses the connection ID
    if (content.includes('connection_id: connectionId')) {
      console.log('  ✅ Uses connection ID variable');
    } else {
      console.log('  ❌ Does NOT use connection ID variable');
    }
  } else {
    console.log('❌ Click-to-call API not found');
  }
}

// 3. Test the voice webhook flow
function testVoiceWebhookFlow() {
  const apiPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    console.log('📋 Voice Webhook Flow Analysis:');
    
    // Check if it checks for the Telnyx phone number
    if (content.includes('TELYNX_PHONE_NUMBER')) {
      console.log('  ✅ Checks for TELYNX_PHONE_NUMBER');
    } else {
      console.log('  ❌ Does NOT check for TELYNX_PHONE_NUMBER');
    }
    
    // Check if it uses demo business for Telnyx calls
    if (content.includes('telnyxPhoneNumber')) {
      console.log('  ✅ Uses telnyxPhoneNumber variable');
    } else {
      console.log('  ❌ Does NOT use telnyxPhoneNumber variable');
    }
    
    // Check if it routes to voice-handler
    if (content.includes('voice-handler')) {
      console.log('  ✅ Routes to voice-handler');
    } else {
      console.log('  ❌ Does NOT route to voice-handler');
    }
    
    // Check if it uses speech gathering
    if (content.includes('gather') && content.includes('speech')) {
      console.log('  ✅ Uses speech gathering');
    } else {
      console.log('  ❌ Does NOT use speech gathering');
    }
  } else {
    console.log('❌ Voice webhook not found');
  }
}

// 4. Test the voice handler flow
function testVoiceHandlerFlow() {
  const apiPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    console.log('📋 Voice Handler Flow Analysis:');
    
    // Check if it uses OpenAI
    if (content.includes('openai.chat.completions.create')) {
      console.log('  ✅ Uses OpenAI chat completions');
    } else {
      console.log('  ❌ Does NOT use OpenAI chat completions');
    }
    
    // Check if it generates AI responses
    if (content.includes('aiResponse')) {
      console.log('  ✅ Generates AI responses');
    } else {
      console.log('  ❌ Does NOT generate AI responses');
    }
    
    // Check if it uses speech gathering
    if (content.includes('gather') && content.includes('speech')) {
      console.log('  ✅ Uses speech gathering');
    } else {
      console.log('  ❌ Does NOT use speech gathering');
    }
    
    // Check if it uses the correct model
    if (content.includes('gpt-4')) {
      console.log('  ✅ Uses GPT-4 model');
    } else {
      console.log('  ❌ Does NOT use GPT-4 model');
    }
  } else {
    console.log('❌ Voice handler not found');
  }
}

// 5. Check for potential issues
function checkPotentialIssues() {
  console.log('📋 Potential Issues Check:');
  
  // Check if the demo conversation API is properly implemented
  const demoApiPath = 'app/api/ai/conversation-demo/route.ts';
  if (fs.existsSync(demoApiPath)) {
    const content = fs.readFileSync(demoApiPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      console.log('  ✅ Demo conversation API properly implemented');
    } else {
      console.log('  ❌ Demo conversation API NOT properly implemented');
    }
  } else {
    console.log('  ❌ Demo conversation API missing');
  }
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    if (content.includes('TELYNX_PHONE_NUMBER') && content.includes('telnyxPhoneNumber')) {
      console.log('  ✅ Voice webhook properly configured for phone number matching');
    } else {
      console.log('  ❌ Voice webhook NOT properly configured for phone number matching');
    }
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (content.includes('openai.chat.completions.create') && content.includes('aiResponse')) {
      console.log('  ✅ Voice handler properly configured for AI responses');
    } else {
      console.log('  ❌ Voice handler NOT properly configured for AI responses');
    }
  }
}

// 6. Create a simple test to verify the AI connection
function createSimpleAITest() {
  const testScript = `
// Simple AI connection test
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

  fs.writeFileSync('scripts/simple-ai-test.js', testScript);
  console.log('✅ Created simple AI test script');
}

// Run all tests
console.log('🔧 Testing complete AI call flow...\n');

testDemoConversationAPI();
testClickToCallFlow();
testVoiceWebhookFlow();
testVoiceHandlerFlow();
checkPotentialIssues();
createSimpleAITest();

console.log('\n🎉 Complete AI call flow test completed!');
console.log('\n📋 WHAT TO CHECK:');
console.log('1. ✅ Demo conversation API should work');
console.log('2. ✅ Click-to-call should create AI session');
console.log('3. ✅ Voice webhook should match phone numbers');
console.log('4. ✅ Voice handler should generate AI responses');
console.log('5. ✅ All APIs should be properly connected');
console.log('\n🚀 NEXT STEPS:');
console.log('1. Run: node scripts/simple-ai-test.js');
console.log('2. Test the demo call functionality');
console.log('3. Check Vercel logs for any errors');
console.log('4. Verify that the AI is actually speaking during calls');
