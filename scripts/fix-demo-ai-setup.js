const fs = require('fs');
const path = require('path');

console.log('🤖 Fixing demo AI setup - ensuring demo business and agent are properly configured...\n');

// 1. Check if demo business exists in database
function checkDemoBusinessSetup() {
  console.log('🔍 Checking demo business setup...');
  
  // Create a script to check and create demo business
  const checkScript = `
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDemoBusiness() {
  console.log('🔍 Checking demo business setup...');
  
  // Check if demo business exists
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();
  
  if (businessError || !business) {
    console.log('❌ Demo business not found - creating it...');
    
    // Create demo business
    const { data: newBusiness, error: createError } = await supabase
      .from('businesses')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        business_name: 'CloudGreet Demo Business',
        business_type: 'HVAC',
        owner_name: 'Demo Owner',
        phone_number: '+18333956731',
        email: 'demo@cloudgreet.com',
        address: '123 Demo St, Demo City, DC 12345',
        business_hours: {
          mon: { open: '08:00', close: '18:00' },
          tue: { open: '08:00', close: '18:00' },
          wed: { open: '08:00', close: '18:00' },
          thu: { open: '08:00', close: '18:00' },
          fri: { open: '08:00', close: '18:00' },
          sat: { open: '09:00', close: '15:00' },
          sun: { open: 'closed', close: 'closed' }
        },
        services: ['HVAC Repair', 'AC Installation', 'Heating Services', 'Maintenance'],
        service_areas: ['Local Area', 'Surrounding Cities'],
        after_hours_policy: 'voicemail',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating demo business:', createError);
    } else {
      console.log('✅ Demo business created successfully');
    }
  } else {
    console.log('✅ Demo business exists');
  }
  
  // Check if demo agent exists
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000002')
    .single();
  
  if (agentError || !agent) {
    console.log('❌ Demo agent not found - creating it...');
    
    // Create demo agent
    const { data: newAgent, error: createAgentError } = await supabase
      .from('ai_agents')
      .insert({
        id: '00000000-0000-0000-0000-000000000002',
        business_id: '00000000-0000-0000-0000-000000000001',
        agent_name: 'Sarah',
        greeting_message: 'Hello! Thank you for calling CloudGreet Demo Business. How can I help you today?',
        tone: 'professional',
        voice: 'alloy',
        custom_instructions: 'You are a professional AI receptionist for a demo HVAC business. Be helpful, ask clarifying questions, and offer to schedule appointments.',
        configuration: {
          greeting_message: 'Hello! Thank you for calling CloudGreet Demo Business. How can I help you today?',
          voice: 'alloy',
          tone: 'professional',
          services: ['HVAC Repair', 'AC Installation', 'Heating Services', 'Maintenance'],
          service_areas: ['Local Area', 'Surrounding Cities'],
          max_call_duration: 10,
          escalation_threshold: 5,
          ai_model: 'gpt-4o-realtime-preview-2024-12-17'
        },
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createAgentError) {
      console.error('❌ Error creating demo agent:', createAgentError);
    } else {
      console.log('✅ Demo agent created successfully');
    }
  } else {
    console.log('✅ Demo agent exists');
  }
}

checkDemoBusiness().catch(console.error);
`;

  // Write the check script
  fs.writeFileSync('scripts/check-demo-setup.js', checkScript);
  console.log('✅ Created demo setup check script');
}

// 2. Check if the voice webhook is properly configured
function checkVoiceWebhookConfig() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the hardcoded demo business ID
    if (content.includes('00000000-0000-0000-0000-000000000001')) {
      console.log('✅ Voice webhook is configured to use demo business');
    } else {
      console.log('❌ Voice webhook not properly configured for demo');
    }
    
    // Check if it's properly connected to AI
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      console.log('✅ Voice webhook properly connected to AI');
    } else {
      console.log('❌ Voice webhook not properly connected to AI');
    }
  } else {
    console.log('❌ Voice webhook not found');
  }
}

// 3. Check if the voice handler is properly configured
function checkVoiceHandlerConfig() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      console.log('✅ Voice handler properly connected to AI');
    } else {
      console.log('❌ Voice handler not properly connected to AI');
    }
  } else {
    console.log('❌ Voice handler not found');
  }
}

// 4. Check environment variables
function checkEnvironmentVariables() {
  const envPath = '.env.local';
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = [
      'OPENAI_API_KEY',
      'TELNYX_API_KEY',
      'TELNYX_PHONE_NUMBER',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !content.includes(varName));
    
    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:', missingVars.join(', '));
      console.log('   Add these to your .env.local file:');
      missingVars.forEach(varName => {
        console.log(`   ${varName}=your_${varName.toLowerCase()}_here`);
      });
    } else {
      console.log('✅ All required environment variables configured');
    }
  } else {
    console.log('❌ .env.local file not found');
  }
}

// Run all checks
console.log('🔧 Checking demo AI setup...\n');

checkDemoBusinessSetup();
checkVoiceWebhookConfig();
checkVoiceHandlerConfig();
checkEnvironmentVariables();

console.log('\n🎉 Demo AI setup check completed!');
console.log('\n📋 WHAT TO CHECK:');
console.log('1. ✅ Demo business and agent should exist in database');
console.log('2. ✅ Voice webhook should be configured for demo');
console.log('3. ✅ Voice handler should be connected to AI');
console.log('4. ✅ Environment variables should be configured');
console.log('\n🚀 NEXT STEPS:');
console.log('1. Run: node scripts/check-demo-setup.js');
console.log('2. Test the demo call functionality');
console.log('3. Check the logs for any AI connection issues');
console.log('4. Verify that the AI is actually speaking during calls');

const path = require('path');

console.log('🤖 Fixing demo AI setup - ensuring demo business and agent are properly configured...\n');

// 1. Check if demo business exists in database
function checkDemoBusinessSetup() {
  console.log('🔍 Checking demo business setup...');
  
  // Create a script to check and create demo business
  const checkScript = `
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDemoBusiness() {
  console.log('🔍 Checking demo business setup...');
  
  // Check if demo business exists
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();
  
  if (businessError || !business) {
    console.log('❌ Demo business not found - creating it...');
    
    // Create demo business
    const { data: newBusiness, error: createError } = await supabase
      .from('businesses')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        business_name: 'CloudGreet Demo Business',
        business_type: 'HVAC',
        owner_name: 'Demo Owner',
        phone_number: '+18333956731',
        email: 'demo@cloudgreet.com',
        address: '123 Demo St, Demo City, DC 12345',
        business_hours: {
          mon: { open: '08:00', close: '18:00' },
          tue: { open: '08:00', close: '18:00' },
          wed: { open: '08:00', close: '18:00' },
          thu: { open: '08:00', close: '18:00' },
          fri: { open: '08:00', close: '18:00' },
          sat: { open: '09:00', close: '15:00' },
          sun: { open: 'closed', close: 'closed' }
        },
        services: ['HVAC Repair', 'AC Installation', 'Heating Services', 'Maintenance'],
        service_areas: ['Local Area', 'Surrounding Cities'],
        after_hours_policy: 'voicemail',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating demo business:', createError);
    } else {
      console.log('✅ Demo business created successfully');
    }
  } else {
    console.log('✅ Demo business exists');
  }
  
  // Check if demo agent exists
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000002')
    .single();
  
  if (agentError || !agent) {
    console.log('❌ Demo agent not found - creating it...');
    
    // Create demo agent
    const { data: newAgent, error: createAgentError } = await supabase
      .from('ai_agents')
      .insert({
        id: '00000000-0000-0000-0000-000000000002',
        business_id: '00000000-0000-0000-0000-000000000001',
        agent_name: 'Sarah',
        greeting_message: 'Hello! Thank you for calling CloudGreet Demo Business. How can I help you today?',
        tone: 'professional',
        voice: 'alloy',
        custom_instructions: 'You are a professional AI receptionist for a demo HVAC business. Be helpful, ask clarifying questions, and offer to schedule appointments.',
        configuration: {
          greeting_message: 'Hello! Thank you for calling CloudGreet Demo Business. How can I help you today?',
          voice: 'alloy',
          tone: 'professional',
          services: ['HVAC Repair', 'AC Installation', 'Heating Services', 'Maintenance'],
          service_areas: ['Local Area', 'Surrounding Cities'],
          max_call_duration: 10,
          escalation_threshold: 5,
          ai_model: 'gpt-4o-realtime-preview-2024-12-17'
        },
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createAgentError) {
      console.error('❌ Error creating demo agent:', createAgentError);
    } else {
      console.log('✅ Demo agent created successfully');
    }
  } else {
    console.log('✅ Demo agent exists');
  }
}

checkDemoBusiness().catch(console.error);
`;

  // Write the check script
  fs.writeFileSync('scripts/check-demo-setup.js', checkScript);
  console.log('✅ Created demo setup check script');
}

// 2. Check if the voice webhook is properly configured
function checkVoiceWebhookConfig() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the hardcoded demo business ID
    if (content.includes('00000000-0000-0000-0000-000000000001')) {
      console.log('✅ Voice webhook is configured to use demo business');
    } else {
      console.log('❌ Voice webhook not properly configured for demo');
    }
    
    // Check if it's properly connected to AI
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      console.log('✅ Voice webhook properly connected to AI');
    } else {
      console.log('❌ Voice webhook not properly connected to AI');
    }
  } else {
    console.log('❌ Voice webhook not found');
  }
}

// 3. Check if the voice handler is properly configured
function checkVoiceHandlerConfig() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      console.log('✅ Voice handler properly connected to AI');
    } else {
      console.log('❌ Voice handler not properly connected to AI');
    }
  } else {
    console.log('❌ Voice handler not found');
  }
}

// 4. Check environment variables
function checkEnvironmentVariables() {
  const envPath = '.env.local';
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = [
      'OPENAI_API_KEY',
      'TELNYX_API_KEY',
      'TELNYX_PHONE_NUMBER',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !content.includes(varName));
    
    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:', missingVars.join(', '));
      console.log('   Add these to your .env.local file:');
      missingVars.forEach(varName => {
        console.log(`   ${varName}=your_${varName.toLowerCase()}_here`);
      });
    } else {
      console.log('✅ All required environment variables configured');
    }
  } else {
    console.log('❌ .env.local file not found');
  }
}

// Run all checks
console.log('🔧 Checking demo AI setup...\n');

checkDemoBusinessSetup();
checkVoiceWebhookConfig();
checkVoiceHandlerConfig();
checkEnvironmentVariables();

console.log('\n🎉 Demo AI setup check completed!');
console.log('\n📋 WHAT TO CHECK:');
console.log('1. ✅ Demo business and agent should exist in database');
console.log('2. ✅ Voice webhook should be configured for demo');
console.log('3. ✅ Voice handler should be connected to AI');
console.log('4. ✅ Environment variables should be configured');
console.log('\n🚀 NEXT STEPS:');
console.log('1. Run: node scripts/check-demo-setup.js');
console.log('2. Test the demo call functionality');
console.log('3. Check the logs for any AI connection issues');
console.log('4. Verify that the AI is actually speaking during calls');
