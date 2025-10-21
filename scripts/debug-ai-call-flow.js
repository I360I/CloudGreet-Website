const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging AI call flow - finding why AI still doesn\'t talk or listen...\n');

// 1. Check the voice webhook flow
function checkVoiceWebhookFlow() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    console.log('📋 Voice Webhook Analysis:');
    
    // Check if it's properly routing to voice handler
    if (content.includes('voice-handler')) {
      console.log('  ✅ Routes to voice-handler');
    } else {
      console.log('  ❌ Does NOT route to voice-handler');
    }
    
    // Check if it's using the correct phone number
    if (content.includes('TELYNX_PHONE_NUMBER')) {
      console.log('  ✅ Uses TELYNX_PHONE_NUMBER');
    } else {
      console.log('  ❌ Does NOT use TELYNX_PHONE_NUMBER');
    }
    
    // Check if it's checking for OpenAI
    if (content.includes('OPENAI_API_KEY')) {
      console.log('  ✅ Checks for OpenAI API key');
    } else {
      console.log('  ❌ Does NOT check for OpenAI API key');
    }
    
    // Check if it's using the demo business
    if (content.includes('00000000-0000-0000-0000-000000000001')) {
      console.log('  ✅ Uses demo business ID');
    } else {
      console.log('  ❌ Does NOT use demo business ID');
    }
  } else {
    console.log('❌ Voice webhook not found');
  }
}

// 2. Check the voice handler flow
function checkVoiceHandlerFlow() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    console.log('📋 Voice Handler Analysis:');
    
    // Check if it's using OpenAI
    if (content.includes('openai.chat.completions.create')) {
      console.log('  ✅ Uses OpenAI chat completions');
    } else {
      console.log('  ❌ Does NOT use OpenAI chat completions');
    }
    
    // Check if it's checking for API key
    if (content.includes('OPENAI_API_KEY')) {
      console.log('  ✅ Checks for OpenAI API key');
    } else {
      console.log('  ❌ Does NOT check for OpenAI API key');
    }
    
    // Check if it's using the correct model
    if (content.includes('gpt-4')) {
      console.log('  ✅ Uses GPT-4 model');
    } else {
      console.log('  ❌ Does NOT use GPT-4 model');
    }
    
    // Check if it's generating proper responses
    if (content.includes('aiResponse')) {
      console.log('  ✅ Generates AI responses');
    } else {
      console.log('  ❌ Does NOT generate AI responses');
    }
  } else {
    console.log('❌ Voice handler not found');
  }
}

// 3. Check the click-to-call flow
function checkClickToCallFlow() {
  const clickToCallPath = 'app/api/click-to-call/initiate/route.ts';
  
  if (fs.existsSync(clickToCallPath)) {
    const content = fs.readFileSync(clickToCallPath, 'utf8');
    
    console.log('📋 Click-to-Call Analysis:');
    
    // Check if it's creating Telnyx calls
    if (content.includes('api.telnyx.com/v2/calls')) {
      console.log('  ✅ Creates Telnyx calls');
    } else {
      console.log('  ❌ Does NOT create Telnyx calls');
    }
    
    // Check if it's using the correct webhook URL
    if (content.includes('voice-webhook')) {
      console.log('  ✅ Uses voice-webhook');
    } else {
      console.log('  ❌ Does NOT use voice-webhook');
    }
    
    // Check if it's using the correct phone number
    if (content.includes('TELYNX_PHONE_NUMBER')) {
      console.log('  ✅ Uses TELYNX_PHONE_NUMBER');
    } else {
      console.log('  ❌ Does NOT use TELYNX_PHONE_NUMBER');
    }
  } else {
    console.log('❌ Click-to-call API not found');
  }
}

// 4. Check for potential issues
function checkPotentialIssues() {
  console.log('📋 Potential Issues:');
  
  // Check if the demo conversation API exists
  const demoApiPath = 'app/api/ai/conversation-demo/route.ts';
  if (fs.existsSync(demoApiPath)) {
    console.log('  ✅ Demo conversation API exists');
  } else {
    console.log('  ❌ Demo conversation API missing');
  }
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    if (content.includes('gather') && content.includes('speech')) {
      console.log('  ✅ Voice webhook configured for speech gathering');
    } else {
      console.log('  ❌ Voice webhook NOT configured for speech gathering');
    }
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (content.includes('gather') && content.includes('speech')) {
      console.log('  ✅ Voice handler configured for speech gathering');
    } else {
      console.log('  ❌ Voice handler NOT configured for speech gathering');
    }
  }
}

// 5. Create a test script to verify the AI connection
function createAITestScript() {
  const testScript = `
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

console.log('\\n🎯 AI Call Flow Test:');
console.log('1. Click-to-call initiates call');
console.log('2. Telnyx routes call to voice-webhook');
console.log('3. Voice-webhook routes to voice-handler');
console.log('4. Voice-handler uses OpenAI to generate responses');
console.log('5. AI speaks back to caller');
`;

  fs.writeFileSync('scripts/test-ai-connection.js', testScript);
  console.log('✅ Created AI connection test script');
}

// Run all checks
console.log('🔧 Debugging AI call flow...\n');

checkVoiceWebhookFlow();
checkVoiceHandlerFlow();
checkClickToCallFlow();
checkPotentialIssues();
createAITestScript();

console.log('\n🎉 AI call flow debugging completed!');
console.log('\n📋 WHAT TO CHECK:');
console.log('1. ✅ Voice webhook should route to voice-handler');
console.log('2. ✅ Voice handler should use OpenAI');
console.log('3. ✅ Click-to-call should create Telnyx calls');
console.log('4. ✅ All APIs should be properly configured');
console.log('\n🚀 NEXT STEPS:');
console.log('1. Run: node scripts/test-ai-connection.js');
console.log('2. Check Vercel logs for any errors');
console.log('3. Test the demo call functionality');
console.log('4. Verify that the AI is actually speaking during calls');
