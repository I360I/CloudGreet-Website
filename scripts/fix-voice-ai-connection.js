const fs = require('fs');
const path = require('path');



// 1. Fix the voice webhook to properly connect to AI
function fixVoiceWebhook() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    let content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's properly connected to AI
    if (!content.includes('OPENAI_API_KEY') || !content.includes('chat/completions')) {
      
      
      // Add AI connection check
      const aiCheck = `
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured for voice webhook');
      return NextResponse.json({
        call_id: call_control_id,
        status: 'answered',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. Our AI system is currently being configured. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      });
    }`;
      
      // Insert AI check after business validation
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
    }${aiCheck}`
      );
      
      fs.writeFileSync(webhookPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 2. Fix the voice handler to ensure it's properly connected to AI
function fixVoiceHandler() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    let content = fs.readFileSync(handlerPath, 'utf8');
    
    // Check if it's properly connected to AI
    if (!content.includes('OPENAI_API_KEY') || !content.includes('chat/completions')) {
      
      
      // Add AI connection check at the beginning
      const aiCheck = `
    // Check if OpenAI is configured
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
      
      // Insert AI check after the initial setup
      content = content.replace(
        /export async function POST\(request: NextRequest\) {[\s\S]*?try {/,
        `export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
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
  } else {
    
  }
}

// 3. Create a test script to verify AI connection
function createAITestScript() {
  const testScript = `
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testAIConnection() {
  
  
  try {
    // Test OpenAI connection
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      messages: [
        { role: 'system', content: 'You are a test AI receptionist.' },
        { role: 'user', content: 'Hello, this is a test call.' }
      ],
      max_tokens: 50,
      temperature: 0.7
    });
    
    const response = completion.choices[0]?.message?.content;
    
    
    // Test database connection
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, business_name')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
    } else {
      
    }
    
    // Test demo business
    const { data: demoBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (demoBusiness) {
      
    } else {
      
    }
    
    // Test demo agent
    const { data: demoAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000002')
      .single();
    
    if (demoAgent) {
      
    } else {
      
    }
    
  } catch (error) {
    console.error('❌ AI connection test failed:', error);
  }
}

testAIConnection().catch(console.error);
`;

  fs.writeFileSync('scripts/test-ai-connection.js', testScript);
  
}

// 4. Check if the demo business and agent exist
function checkDemoSetup() {
  
  
  // Check if demo business exists
  const businessPath = 'app/api/admin/businesses/route.ts';
  if (fs.existsSync(businessPath)) {
    
  } else {
    
  }
  
  // Check if demo agent exists
  const agentPath = 'app/api/admin/ai-agents/route.ts';
  if (fs.existsSync(agentPath)) {
    
  } else {
    
  }
}

// Run all fixes


fixVoiceWebhook();
fixVoiceHandler();
createAITestScript();
checkDemoSetup();













const path = require('path');



// 1. Fix the voice webhook to properly connect to AI
function fixVoiceWebhook() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    let content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's properly connected to AI
    if (!content.includes('OPENAI_API_KEY') || !content.includes('chat/completions')) {
      
      
      // Add AI connection check
      const aiCheck = `
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured for voice webhook');
      return NextResponse.json({
        call_id: call_control_id,
        status: 'answered',
        instructions: [
          { instruction: 'say', text: 'Thank you for calling. Our AI system is currently being configured. Please try again later.', voice: 'alloy' },
          { instruction: 'hangup' }
        ]
      });
    }`;
      
      // Insert AI check after business validation
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
    }${aiCheck}`
      );
      
      fs.writeFileSync(webhookPath, content);
      
    } else {
      
    }
  } else {
    
  }
}

// 2. Fix the voice handler to ensure it's properly connected to AI
function fixVoiceHandler() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    let content = fs.readFileSync(handlerPath, 'utf8');
    
    // Check if it's properly connected to AI
    if (!content.includes('OPENAI_API_KEY') || !content.includes('chat/completions')) {
      
      
      // Add AI connection check at the beginning
      const aiCheck = `
    // Check if OpenAI is configured
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
      
      // Insert AI check after the initial setup
      content = content.replace(
        /export async function POST\(request: NextRequest\) {[\s\S]*?try {/,
        `export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
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
  } else {
    
  }
}

// 3. Create a test script to verify AI connection
function createAITestScript() {
  const testScript = `
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testAIConnection() {
  
  
  try {
    // Test OpenAI connection
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      messages: [
        { role: 'system', content: 'You are a test AI receptionist.' },
        { role: 'user', content: 'Hello, this is a test call.' }
      ],
      max_tokens: 50,
      temperature: 0.7
    });
    
    const response = completion.choices[0]?.message?.content;
    
    
    // Test database connection
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, business_name')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
    } else {
      
    }
    
    // Test demo business
    const { data: demoBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (demoBusiness) {
      
    } else {
      
    }
    
    // Test demo agent
    const { data: demoAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000002')
      .single();
    
    if (demoAgent) {
      
    } else {
      
    }
    
  } catch (error) {
    console.error('❌ AI connection test failed:', error);
  }
}

testAIConnection().catch(console.error);
`;

  fs.writeFileSync('scripts/test-ai-connection.js', testScript);
  
}

// 4. Check if the demo business and agent exist
function checkDemoSetup() {
  
  
  // Check if demo business exists
  const businessPath = 'app/api/admin/businesses/route.ts';
  if (fs.existsSync(businessPath)) {
    
  } else {
    
  }
  
  // Check if demo agent exists
  const agentPath = 'app/api/admin/ai-agents/route.ts';
  if (fs.existsSync(agentPath)) {
    
  } else {
    
  }
}

// Run all fixes


fixVoiceWebhook();
fixVoiceHandler();
createAITestScript();
checkDemoSetup();












