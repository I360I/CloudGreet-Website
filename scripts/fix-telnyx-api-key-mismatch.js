const fs = require('fs');
const path = require('path');



// 1. Fix the voice webhook to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixVoiceWebhookTelnyxKey() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    let content = fs.readFileSync(webhookPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(webhookPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 2. Fix the voice handler to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixVoiceHandlerTelnyxKey() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    let content = fs.readFileSync(handlerPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(handlerPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 3. Fix the click-to-call API to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixClickToCallTelnyxKey() {
  const clickToCallPath = 'app/api/click-to-call/initiate/route.ts';
  
  if (fs.existsSync(clickToCallPath)) {
    let content = fs.readFileSync(clickToCallPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(clickToCallPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 4. Fix the Telnyx client to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixTelnyxClient() {
  const telnyxPath = 'lib/telnyx.ts';
  
  if (fs.existsSync(telnyxPath)) {
    let content = fs.readFileSync(telnyxPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(telnyxPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 5. Check for any other files that might have the wrong API key
function fixAllTelnyxReferences() {
  
  
  // Find all files that contain TELNYX_API_KEY
  const files = [
    'app/api/telnyx/voice-webhook/route.ts',
    'app/api/telnyx/voice-handler/route.ts',
    'app/api/click-to-call/initiate/route.ts',
    'lib/telnyx.ts',
    'app/api/phone/auto-provision/route.ts',
    'app/api/phone/assign/route.ts'
  ];
  
  files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes('TELNYX_API_KEY')) {
        content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
        fs.writeFileSync(filePath, content);
        
      }
    }
  });
}

// 6. Add missing TELYNX_PHONE_NUMBER environment variable check
function addPhoneNumberCheck() {
  
  
  // You need to add TELYNX_PHONE_NUMBER to your .env.local file
  
  
  
}

// Run all fixes


fixVoiceWebhookTelnyxKey();
fixVoiceHandlerTelnyxKey();
fixClickToCallTelnyxKey();
fixTelnyxClient();
fixAllTelnyxReferences();
addPhoneNumberCheck();














const path = require('path');



// 1. Fix the voice webhook to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixVoiceWebhookTelnyxKey() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    let content = fs.readFileSync(webhookPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(webhookPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 2. Fix the voice handler to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixVoiceHandlerTelnyxKey() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    let content = fs.readFileSync(handlerPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(handlerPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 3. Fix the click-to-call API to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixClickToCallTelnyxKey() {
  const clickToCallPath = 'app/api/click-to-call/initiate/route.ts';
  
  if (fs.existsSync(clickToCallPath)) {
    let content = fs.readFileSync(clickToCallPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(clickToCallPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 4. Fix the Telnyx client to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixTelnyxClient() {
  const telnyxPath = 'lib/telnyx.ts';
  
  if (fs.existsSync(telnyxPath)) {
    let content = fs.readFileSync(telnyxPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(telnyxPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 5. Check for any other files that might have the wrong API key
function fixAllTelnyxReferences() {
  
  
  // Find all files that contain TELNYX_API_KEY
  const files = [
    'app/api/telnyx/voice-webhook/route.ts',
    'app/api/telnyx/voice-handler/route.ts',
    'app/api/click-to-call/initiate/route.ts',
    'lib/telnyx.ts',
    'app/api/phone/auto-provision/route.ts',
    'app/api/phone/assign/route.ts'
  ];
  
  files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes('TELNYX_API_KEY')) {
        content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
        fs.writeFileSync(filePath, content);
        
      }
    }
  });
}

// 6. Add missing TELYNX_PHONE_NUMBER environment variable check
function addPhoneNumberCheck() {
  
  
  // You need to add TELYNX_PHONE_NUMBER to your .env.local file
  
  
  
}

// Run all fixes


fixVoiceWebhookTelnyxKey();
fixVoiceHandlerTelnyxKey();
fixClickToCallTelnyxKey();
fixTelnyxClient();
fixAllTelnyxReferences();
addPhoneNumberCheck();













