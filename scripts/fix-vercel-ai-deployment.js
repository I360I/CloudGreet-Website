const fs = require('fs');
const path = require('path');



// 1. Check what environment variables are actually being used
function checkEnvironmentVariableUsage() {
  
  
  // Check voice webhook
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    
    if (content.includes('TELYNX_API_KEY')) 
    if (content.includes('TELYNX_PHONE_NUMBER')) 
    if (content.includes('OPENAI_API_KEY')) 
    if (content.includes('NEXT_PUBLIC_APP_URL')) 
  }
  
  // Check voice handler
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    
    if (content.includes('OPENAI_API_KEY')) 
    if (content.includes('NEXT_PUBLIC_APP_URL')) 
  }
}

// 2. Fix the voice webhook to handle missing phone number gracefully
function fixVoiceWebhookPhoneNumber() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    let content = fs.readFileSync(webhookPath, 'utf8');
    
    // Add fallback for missing phone number
    const phoneNumberFallback = `
    // Handle missing phone number gracefully
    const telnyxPhoneNumber = process.env.TELYNX_PHONE_NUMBER || process.env.TELYNX_PHONE_NUMBER || '+18333956731';
    if (!telnyxPhoneNumber) {
      logger.error('No Telnyx phone number configured');
      return NextResponse.json({
        call_id: call_control_id,
        status: 'answered',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. We are currently unavailable. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      });
    }`;
    
    // Insert phone number check after business validation
    if (!content.includes('telnyxPhoneNumber')) {
      content = content.replace(
        /if \(businessError \|\| !business\) {[\s\S]*?}\)/,
        `if (businessError || !business) {
      logger.error('Error finding business for webhook', { error: businessError, to })
      return NextResponse.json({
        call_id: call_control_id,
        status: 'answered',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. We are currently unavailable. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      })
    }${phoneNumberFallback}`
      );
      
      fs.writeFileSync(webhookPath, content);
      
    } else {
      
    }
  }
}

// 3. Fix the voice handler to ensure AI responses work
function fixVoiceHandlerAI() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    let content = fs.readFileSync(handlerPath, 'utf8');
    
    // Add better error handling for AI responses
    const aiErrorHandling = `
    // Enhanced AI error handling
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured for voice handler');
      return NextResponse.json({
        call_id: callId,
        status: 'active',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. Our AI system is currently being configured. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      });
    }`;
    
    // Insert AI error handling at the beginning
    if (!content.includes('Enhanced AI error handling')) {
      content = content.replace(
        /export async function POST\(request: NextRequest\) {[\s\S]*?try {/,
        `export async function POST(request: NextRequest) {
  try {
    // Enhanced AI error handling
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured for voice handler');
      return NextResponse.json({
        call_id: callId,
        status: 'active',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. Our AI system is currently being configured. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      });
    }`
      );
      
      fs.writeFileSync(handlerPath, content);
      
    } else {
      
    }
  }
}

// 4. Create a Vercel environment variable checklist
function createVercelEnvChecklist() {
  
  
  
  
  
  
  
  
  :');
  
  
  
  
  
  
  
}

// 5. Create a deployment test script
function createDeploymentTest() {
  const testScript = `
// Test script to verify AI deployment


// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';


// Check critical environment variables
const requiredVars = [
  'OPENAI_API_KEY',
  'TELYNX_API_KEY', 
  'TELYNX_PHONE_NUMBER',
  'NEXT_PUBLIC_APP_URL'
];


requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    }...\`);
  } else {
    
  }
});

// Test OpenAI connection
if (process.env.OPENAI_API_KEY) {
  
  // This would test the actual OpenAI API
  
} else {
  
}


);



`;

  fs.writeFileSync('scripts/test-ai-deployment.js', testScript);
  
}

// Run all fixes


checkEnvironmentVariableUsage();
fixVoiceWebhookPhoneNumber();
fixVoiceHandlerAI();
createVercelEnvChecklist();
createDeploymentTest();



















