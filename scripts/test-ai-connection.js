
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
  console.log('🧪 Testing AI connection...');
  
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
    console.log('✅ OpenAI connection successful:', response);
    
    // Test database connection
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, business_name')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test demo business
    const { data: demoBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (demoBusiness) {
      console.log('✅ Demo business found:', demoBusiness.business_name);
    } else {
      console.log('❌ Demo business not found');
    }
    
    // Test demo agent
    const { data: demoAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000002')
      .single();
    
    if (demoAgent) {
      console.log('✅ Demo agent found:', demoAgent.agent_name);
    } else {
      console.log('❌ Demo agent not found');
    }
    
  } catch (error) {
    console.error('❌ AI connection test failed:', error);
  }
}

testAIConnection().catch(console.error);
