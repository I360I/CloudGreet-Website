// Check existing agents to understand the correct format
require('dotenv').config({ path: '.env.local' });

async function checkExistingAgents() {
  console.log('🔍 CHECKING EXISTING AGENTS FORMAT');
  console.log('==================================');

  const retellApiKey = process.env.NEXT_PUBLIC_RETELL_API_KEY;
  
  try {
    const response = await fetch('https://api.retellai.com/list-agents', {
      headers: {
        'Authorization': `Bearer ${retellApiKey}`
      }
    });

    if (response.ok) {
      const agents = await response.json();
      console.log(`Found ${agents.length} agents`);
      
      if (agents.length > 0) {
        console.log('\n📋 First agent structure:');
        console.log(JSON.stringify(agents[0], null, 2));
        
        // Try to get detailed info for one agent
        const agentId = agents[0].agent_id;
        console.log(`\n🔍 Getting detailed info for agent: ${agentId}`);
        
        const detailResponse = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
          headers: {
            'Authorization': `Bearer ${retellApiKey}`
          }
        });
        
        if (detailResponse.ok) {
          const agentDetail = await detailResponse.json();
          console.log('\n📋 Detailed agent structure:');
          console.log(JSON.stringify(agentDetail, null, 2));
        } else {
          console.log(`❌ Failed to get agent details: ${detailResponse.status}`);
        }
      }
    } else {
      console.log(`❌ Failed to list agents: ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkExistingAgents();
