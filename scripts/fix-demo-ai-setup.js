const fs = require('fs');
const path = require('path');



// 1. Check if demo business exists in database
function checkDemoBusinessSetup() {
  
  
  // Create a script to check and create demo business
  const checkScript = `
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDemoBusiness() {
  
  
  // Check if demo business exists
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();
  
  if (businessError || !business) {
    
    
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
      
    }
  } else {
    
  }
  
  // Check if demo agent exists
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000002')
    .single();
  
  if (agentError || !agent) {
    
    
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
      
    }
  } else {
    
  }
}

checkDemoBusiness().catch(console.error);
`;

  // Write the check script
  fs.writeFileSync('scripts/check-demo-setup.js', checkScript);
  
}

// 2. Check if the voice webhook is properly configured
function checkVoiceWebhookConfig() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the hardcoded demo business ID
    if (content.includes('00000000-0000-0000-0000-000000000001')) {
      
    } else {
      
    }
    
    // Check if it's properly connected to AI
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 3. Check if the voice handler is properly configured
function checkVoiceHandlerConfig() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      
    } else {
      
    }
  } else {
    
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
      );
      
      missingVars.forEach(varName => {
        }_here`);
      });
    } else {
      
    }
  } else {
    
  }
}

// Run all checks


checkDemoBusinessSetup();
checkVoiceWebhookConfig();
checkVoiceHandlerConfig();
checkEnvironmentVariables();













const path = require('path');



// 1. Check if demo business exists in database
function checkDemoBusinessSetup() {
  
  
  // Create a script to check and create demo business
  const checkScript = `
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDemoBusiness() {
  
  
  // Check if demo business exists
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();
  
  if (businessError || !business) {
    
    
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
      
    }
  } else {
    
  }
  
  // Check if demo agent exists
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000002')
    .single();
  
  if (agentError || !agent) {
    
    
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
      
    }
  } else {
    
  }
}

checkDemoBusiness().catch(console.error);
`;

  // Write the check script
  fs.writeFileSync('scripts/check-demo-setup.js', checkScript);
  
}

// 2. Check if the voice webhook is properly configured
function checkVoiceWebhookConfig() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the hardcoded demo business ID
    if (content.includes('00000000-0000-0000-0000-000000000001')) {
      
    } else {
      
    }
    
    // Check if it's properly connected to AI
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 3. Check if the voice handler is properly configured
function checkVoiceHandlerConfig() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      
    } else {
      
    }
  } else {
    
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
      );
      
      missingVars.forEach(varName => {
        }_here`);
      });
    } else {
      
    }
  } else {
    
  }
}

// Run all checks


checkDemoBusinessSetup();
checkVoiceWebhookConfig();
checkVoiceHandlerConfig();
checkEnvironmentVariables();












