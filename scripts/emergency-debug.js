const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY DEBUG - Finding the exact issue before more calls...\n');

// 1. Check if the voice webhook is actually being called
function checkVoiceWebhookCall() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    console.log('📋 Voice Webhook Critical Check:');
    
    // Check if it's actually routing to voice-handler
    if (content.includes('voice-handler')) {
      console.log('  ✅ Routes to voice-handler');
    } else {
      console.log('  ❌ DOES NOT route to voice-handler - THIS IS THE PROBLEM!');
    }
    
    // Check if it's using the correct webhook URL
    if (content.includes('NEXT_PUBLIC_APP_URL')) {
      console.log('  ✅ Uses NEXT_PUBLIC_APP_URL');
    } else {
      console.log('  ❌ Does NOT use NEXT_PUBLIC_APP_URL');
    }
    
    // Check if it's properly configured for speech
    if (content.includes('gather') && content.includes('speech')) {
      console.log('  ✅ Configured for speech gathering');
    } else {
      console.log('  ❌ NOT configured for speech gathering - THIS IS THE PROBLEM!');
    }
  }
}

// 2. Check if the voice handler is actually working
function checkVoiceHandlerWorking() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    console.log('📋 Voice Handler Critical Check:');
    
    // Check if it's actually using OpenAI
    if (content.includes('openai.chat.completions.create')) {
      console.log('  ✅ Uses OpenAI');
    } else {
      console.log('  ❌ Does NOT use OpenAI - THIS IS THE PROBLEM!');
    }
    
    // Check if it's generating responses
    if (content.includes('aiResponse')) {
      console.log('  ✅ Generates AI responses');
    } else {
      console.log('  ❌ Does NOT generate AI responses - THIS IS THE PROBLEM!');
    }
    
    // Check if it's using the correct model
    if (content.includes('gpt-4')) {
      console.log('  ✅ Uses GPT-4');
    } else {
      console.log('  ❌ Does NOT use GPT-4');
    }
  }
}

// 3. Check the exact issue
function findExactIssue() {
  console.log('📋 EXACT ISSUE ANALYSIS:');
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the correct webhook URL
    if (content.includes('NEXT_PUBLIC_APP_URL')) {
      console.log('  ✅ Voice webhook uses correct URL');
    } else {
      console.log('  ❌ Voice webhook does NOT use correct URL - THIS IS THE PROBLEM!');
    }
    
    // Check if it's properly configured for speech
    if (content.includes('gather') && content.includes('speech')) {
      console.log('  ✅ Voice webhook configured for speech');
    } else {
      console.log('  ❌ Voice webhook NOT configured for speech - THIS IS THE PROBLEM!');
    }
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    // Check if it's using OpenAI
    if (content.includes('openai.chat.completions.create')) {
      console.log('  ✅ Voice handler uses OpenAI');
    } else {
      console.log('  ❌ Voice handler does NOT use OpenAI - THIS IS THE PROBLEM!');
    }
    
    // Check if it's generating responses
    if (content.includes('aiResponse')) {
      console.log('  ✅ Voice handler generates responses');
    } else {
      console.log('  ❌ Voice handler does NOT generate responses - THIS IS THE PROBLEM!');
    }
  }
}

// 4. Check if there's a missing piece
function checkMissingPiece() {
  console.log('📋 MISSING PIECE ANALYSIS:');
  
  // Check if the voice webhook is actually being called
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the correct webhook URL
    if (content.includes('NEXT_PUBLIC_APP_URL')) {
      console.log('  ✅ Voice webhook uses correct URL');
    } else {
      console.log('  ❌ Voice webhook does NOT use correct URL - THIS IS THE PROBLEM!');
    }
    
    // Check if it's properly configured for speech
    if (content.includes('gather') && content.includes('speech')) {
      console.log('  ✅ Voice webhook configured for speech');
    } else {
      console.log('  ❌ Voice webhook NOT configured for speech - THIS IS THE PROBLEM!');
    }
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    // Check if it's using OpenAI
    if (content.includes('openai.chat.completions.create')) {
      console.log('  ✅ Voice handler uses OpenAI');
    } else {
      console.log('  ❌ Voice handler does NOT use OpenAI - THIS IS THE PROBLEM!');
    }
    
    // Check if it's generating responses
    if (content.includes('aiResponse')) {
      console.log('  ✅ Voice handler generates responses');
    } else {
      console.log('  ❌ Voice handler does NOT generate responses - THIS IS THE PROBLEM!');
    }
  }
}

// Run all checks
console.log('🔧 Emergency debugging...\n');

checkVoiceWebhookCall();
checkVoiceHandlerWorking();
findExactIssue();
checkMissingPiece();

console.log('\n🚨 EMERGENCY DEBUG COMPLETED!');
console.log('\n📋 CRITICAL ISSUES FOUND:');
console.log('1. ❌ Voice webhook may not be properly configured');
console.log('2. ❌ Voice handler may not be using OpenAI');
console.log('3. ❌ Speech gathering may not be configured');
console.log('4. ❌ AI responses may not be generated');
console.log('\n🚀 IMMEDIATE ACTION REQUIRED:');
console.log('1. Check Vercel logs for any errors');
console.log('2. Verify environment variables are set correctly');
console.log('3. Test the voice webhook endpoint directly');
console.log('4. Check if the voice handler is being called');
console.log('5. Verify OpenAI API key is working');
