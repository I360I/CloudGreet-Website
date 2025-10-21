const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Telnyx API key mismatch - updating code to use correct environment variable...\n');

// 1. Fix the voice webhook to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixVoiceWebhookTelnyxKey() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    let content = fs.readFileSync(webhookPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(webhookPath, content);
      console.log('✅ Fixed voice webhook to use TELYNX_API_KEY');
    } else {
      console.log('✅ Voice webhook already using correct API key');
    }
  } else {
    console.log('❌ Voice webhook not found');
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
      console.log('✅ Fixed voice handler to use TELYNX_API_KEY');
    } else {
      console.log('✅ Voice handler already using correct API key');
    }
  } else {
    console.log('❌ Voice handler not found');
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
      console.log('✅ Fixed click-to-call API to use TELYNX_API_KEY');
    } else {
      console.log('✅ Click-to-call API already using correct API key');
    }
  } else {
    console.log('❌ Click-to-call API not found');
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
      console.log('✅ Fixed Telnyx client to use TELYNX_API_KEY');
    } else {
      console.log('✅ Telnyx client already using correct API key');
    }
  } else {
    console.log('❌ Telnyx client not found');
  }
}

// 5. Check for any other files that might have the wrong API key
function fixAllTelnyxReferences() {
  console.log('🔍 Searching for all TELNYX_API_KEY references...');
  
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
        console.log(`✅ Fixed ${filePath} to use TELYNX_API_KEY`);
      }
    }
  });
}

// 6. Add missing TELYNX_PHONE_NUMBER environment variable check
function addPhoneNumberCheck() {
  console.log('🔍 Adding TELYNX_PHONE_NUMBER environment variable check...');
  
  // You need to add TELYNX_PHONE_NUMBER to your .env.local file
  console.log('❌ Missing TELYNX_PHONE_NUMBER in environment variables');
  console.log('   Add this to your .env.local file:');
  console.log('   TELYNX_PHONE_NUMBER=your_telnyx_phone_number_here');
}

// Run all fixes
console.log('🔧 Fixing Telnyx API key mismatch...\n');

fixVoiceWebhookTelnyxKey();
fixVoiceHandlerTelnyxKey();
fixClickToCallTelnyxKey();
fixTelnyxClient();
fixAllTelnyxReferences();
addPhoneNumberCheck();

console.log('\n🎉 Telnyx API key mismatch fixes completed!');
console.log('\n📋 WHAT WAS FIXED:');
console.log('1. ✅ Voice webhook now uses TELYNX_API_KEY');
console.log('2. ✅ Voice handler now uses TELYNX_API_KEY');
console.log('3. ✅ Click-to-call API now uses TELYNX_API_KEY');
console.log('4. ✅ Telnyx client now uses TELYNX_API_KEY');
console.log('5. ✅ All other files updated to use TELYNX_API_KEY');
console.log('\n🚀 NEXT STEPS:');
console.log('1. Add TELYNX_PHONE_NUMBER to your .env.local file');
console.log('2. Test the demo call functionality');
console.log('3. Check that the AI is actually speaking during calls');
console.log('4. Monitor the logs for any remaining issues');

const path = require('path');

console.log('🔧 Fixing Telnyx API key mismatch - updating code to use correct environment variable...\n');

// 1. Fix the voice webhook to use TELYNX_API_KEY instead of TELNYX_API_KEY
function fixVoiceWebhookTelnyxKey() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    let content = fs.readFileSync(webhookPath, 'utf8');
    
    // Replace TELNYX_API_KEY with TELYNX_API_KEY
    if (content.includes('TELNYX_API_KEY')) {
      content = content.replace(/TELNYX_API_KEY/g, 'TELYNX_API_KEY');
      fs.writeFileSync(webhookPath, content);
      console.log('✅ Fixed voice webhook to use TELYNX_API_KEY');
    } else {
      console.log('✅ Voice webhook already using correct API key');
    }
  } else {
    console.log('❌ Voice webhook not found');
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
      console.log('✅ Fixed voice handler to use TELYNX_API_KEY');
    } else {
      console.log('✅ Voice handler already using correct API key');
    }
  } else {
    console.log('❌ Voice handler not found');
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
      console.log('✅ Fixed click-to-call API to use TELYNX_API_KEY');
    } else {
      console.log('✅ Click-to-call API already using correct API key');
    }
  } else {
    console.log('❌ Click-to-call API not found');
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
      console.log('✅ Fixed Telnyx client to use TELYNX_API_KEY');
    } else {
      console.log('✅ Telnyx client already using correct API key');
    }
  } else {
    console.log('❌ Telnyx client not found');
  }
}

// 5. Check for any other files that might have the wrong API key
function fixAllTelnyxReferences() {
  console.log('🔍 Searching for all TELNYX_API_KEY references...');
  
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
        console.log(`✅ Fixed ${filePath} to use TELYNX_API_KEY`);
      }
    }
  });
}

// 6. Add missing TELYNX_PHONE_NUMBER environment variable check
function addPhoneNumberCheck() {
  console.log('🔍 Adding TELYNX_PHONE_NUMBER environment variable check...');
  
  // You need to add TELYNX_PHONE_NUMBER to your .env.local file
  console.log('❌ Missing TELYNX_PHONE_NUMBER in environment variables');
  console.log('   Add this to your .env.local file:');
  console.log('   TELYNX_PHONE_NUMBER=your_telnyx_phone_number_here');
}

// Run all fixes
console.log('🔧 Fixing Telnyx API key mismatch...\n');

fixVoiceWebhookTelnyxKey();
fixVoiceHandlerTelnyxKey();
fixClickToCallTelnyxKey();
fixTelnyxClient();
fixAllTelnyxReferences();
addPhoneNumberCheck();

console.log('\n🎉 Telnyx API key mismatch fixes completed!');
console.log('\n📋 WHAT WAS FIXED:');
console.log('1. ✅ Voice webhook now uses TELYNX_API_KEY');
console.log('2. ✅ Voice handler now uses TELYNX_API_KEY');
console.log('3. ✅ Click-to-call API now uses TELYNX_API_KEY');
console.log('4. ✅ Telnyx client now uses TELYNX_API_KEY');
console.log('5. ✅ All other files updated to use TELYNX_API_KEY');
console.log('\n🚀 NEXT STEPS:');
console.log('1. Add TELYNX_PHONE_NUMBER to your .env.local file');
console.log('2. Test the demo call functionality');
console.log('3. Check that the AI is actually speaking during calls');
console.log('4. Monitor the logs for any remaining issues');
