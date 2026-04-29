const fs = require('fs');



// Test 1: Check if demo conversation API works
async function testDemoConversationAPI() {
  
  
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
      
      }...`);
      return true;
    } else {
      
      
      return false;
    }
  } catch (error) {
    
    return false;
  }
}

// Test 2: Check if click-to-call API works
async function testClickToCallAPI() {
  
  
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
      
      
      return true;
    } else {
      
      
      const errorText = await response.text();
      }...`);
      return false;
    }
  } catch (error) {
    
    return false;
  }
}

// Test 3: Check if voice webhook is accessible
async function testVoiceWebhook() {
  
  
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
      
      
      
      return true;
    } else {
      
      
      const errorText = await response.text();
      }...`);
      return false;
    }
  } catch (error) {
    
    return false;
  }
}

// Test 4: Check if voice handler is accessible
async function testVoiceHandler() {
  
  
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
      
      
      
      if (data.instructions && data.instructions.length > 0) {
        
        if (data.instructions[0].text) {
          }...`);
        }
      }
      return true;
    } else {
      
      
      const errorText = await response.text();
      }...`);
      return false;
    }
  } catch (error) {
    
    return false;
  }
}

// Run all tests
async function runTests() {
  
  
  const results = {
    demoConversation: await testDemoConversationAPI(),
    clickToCall: await testClickToCallAPI(),
    voiceWebhook: await testVoiceWebhook(),
    voiceHandler: await testVoiceHandler()
  };
  
  
  
  
  
  
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    
  } else {
    
    
    if (!results.demoConversation) {
      
    }
    if (!results.clickToCall) {
      
    }
    if (!results.voiceWebhook) {
      
    }
    if (!results.voiceHandler) {
      
    }
  }
}

runTests().catch(console.error);
