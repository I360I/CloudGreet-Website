const fs = require('fs');

console.log('🧪 TESTING ACTUAL CALL FLOW...\n');

// Test 1: Check if demo conversation API works
async function testDemoConversationAPI() {
  console.log('📋 Testing Demo Conversation API...');
  
  try {
    const response = await fetch('https://cloudgreet.com/api/ai/conversation-demo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        businessType: 'Service Business',
        businessName: 'Test Business',
        services: 'General Services',
        hours: '9 AM - 5 PM'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Demo conversation API works');
      console.log(`  📝 AI Response: ${data.aiResponse?.substring(0, 100)}...`);
      return true;
    } else {
      console.log('  ❌ Demo conversation API failed');
      console.log(`  📝 Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Demo conversation API error:', error.message);
    return false;
  }
}

// Test 2: Check if click-to-call API works
async function testClickToCallAPI() {
  console.log('\n📋 Testing Click-to-Call API...');
  
  try {
    const response = await fetch('https://cloudgreet.com/api/click-to-call/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: '+1234567890',
        businessName: 'Test Business',
        businessType: 'Service Business'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Click-to-call API works');
      console.log(`  📝 Call ID: ${data.callId || 'N/A'}`);
      return true;
    } else {
      console.log('  ❌ Click-to-call API failed');
      console.log(`  📝 Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`  📝 Error: ${errorText.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Click-to-call API error:', error.message);
    return false;
  }
}

// Test 3: Check if voice webhook is accessible
async function testVoiceWebhook() {
  console.log('\n📋 Testing Voice Webhook...');
  
  try {
    const response = await fetch('https://cloudgreet.com/api/telnyx/voice-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        call_control_id: 'test-call-123',
        from: '+1234567890',
        to: '+18333956731',
        event_type: 'call.initiated'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Voice webhook accessible');
      console.log(`  📝 Status: ${data.status}`);
      console.log(`  📝 Instructions: ${data.instructions?.length || 0} instructions`);
      return true;
    } else {
      console.log('  ❌ Voice webhook failed');
      console.log(`  📝 Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`  📝 Error: ${errorText.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Voice webhook error:', error.message);
    return false;
  }
}

// Test 4: Check if voice handler is accessible
async function testVoiceHandler() {
  console.log('\n📋 Testing Voice Handler...');
  
  try {
    const response = await fetch('https://cloudgreet.com/api/telnyx/voice-handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        call_control_id: 'test-call-123',
        from: '+1234567890',
        to: '+18333956731',
        SpeechResult: 'Hello, I need help with my business'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Voice handler accessible');
      console.log(`  📝 Status: ${data.status}`);
      console.log(`  📝 Instructions: ${data.instructions?.length || 0} instructions`);
      if (data.instructions && data.instructions.length > 0) {
        console.log(`  📝 First instruction: ${data.instructions[0].instruction}`);
        if (data.instructions[0].text) {
          console.log(`  📝 AI Response: ${data.instructions[0].text.substring(0, 100)}...`);
        }
      }
      return true;
    } else {
      console.log('  ❌ Voice handler failed');
      console.log(`  📝 Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`  📝 Error: ${errorText.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Voice handler error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🔧 Running actual call flow tests...\n');
  
  const results = {
    demoConversation: await testDemoConversationAPI(),
    clickToCall: await testClickToCallAPI(),
    voiceWebhook: await testVoiceWebhook(),
    voiceHandler: await testVoiceHandler()
  };
  
  console.log('\n📋 TEST RESULTS:');
  console.log(`Demo Conversation API: ${results.demoConversation ? '✅' : '❌'}`);
  console.log(`Click-to-Call API: ${results.clickToCall ? '✅' : '❌'}`);
  console.log(`Voice Webhook: ${results.voiceWebhook ? '✅' : '❌'}`);
  console.log(`Voice Handler: ${results.voiceHandler ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED - The AI should be working!');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Issues found:');
    console.log('\n🚨 CRITICAL ISSUES:');
    if (!results.demoConversation) {
      console.log('- Demo conversation API is not working');
    }
    if (!results.clickToCall) {
      console.log('- Click-to-call API is not working');
    }
    if (!results.voiceWebhook) {
      console.log('- Voice webhook is not working');
    }
    if (!results.voiceHandler) {
      console.log('- Voice handler is not working');
    }
  }
}

runTests().catch(console.error);
