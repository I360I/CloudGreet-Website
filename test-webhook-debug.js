const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDemoBusiness() {
  console.log('🔍 Checking demo business...');
  
  // Check if demo business exists
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', 'demo-business-id')
    .single();
  
  console.log('Demo business:', business);
  console.log('Business error:', businessError);
  
  // Check if demo agent exists
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', 'demo-agent-id')
    .single();
  
  console.log('Demo agent:', agent);
  console.log('Agent error:', agentError);
  
  // Check business hours
  if (business) {
    console.log('Business hours:', business.business_hours);
    console.log('Is 24/7?', JSON.stringify(business.business_hours));
  }
}

testDemoBusiness().catch(console.error);
