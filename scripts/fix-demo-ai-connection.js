const fs = require('fs');
const path = require('path');



// 1. Fix the click-to-call API to use real AI services instead of hardcoded demo data
function fixClickToCallAPI() {
  const apiPath = 'app/api/click-to-call/initiate/route.ts';
  
  if (fs.existsSync(apiPath)) {
    let content = fs.readFileSync(apiPath, 'utf8');
    
    // Check if it's using hardcoded demo data
    if (content.includes('00000000-0000-0000-0000-000000000001')) {
      
      
      // Replace hardcoded demo business with real AI connection
      const fixedContent = content.replace(
        /\/\/ Create or get demo business and agent for click-to-call[\s\S]*?const agentId = '00000000-0000-0000-0000-000000000002'[\s\S]*?\/\/ Check if demo business exists, if not create it[\s\S]*?const { data: existingBusiness } = await supabaseAdmin[\s\S]*?\.single\(\)/,
        `// Create AI conversation session for demo call
      const aiSessionResponse = await fetch(\`\${process.env.NEXT_PUBLIC_APP_URL}/api/ai/conversation-demo\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessType: businessType || 'HVAC',
          businessName: businessName,
          services: services,
          hours: hours
        })
      });
      
      if (!aiSessionResponse.ok) {
        throw new Error('Failed to create AI session');
      }
      
      const aiSession = await aiSessionResponse.json();
      
      if (!aiSession.success) {
        throw new Error(aiSession.error || 'Failed to create AI session');
      }`
      );
      
      // Also fix the Telnyx call creation to use real AI
      const finalContent = fixedContent.replace(
        /\/\/ Create Telnyx call with AI agent[\s\S]*?const callResponse = await fetch[\s\S]*?}/,
        `// Create Telnyx call with AI agent
      const callResponse = await fetch('https://api.telnyx.com/v2/calls', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${process.env.TELNYX_API_KEY}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.TELNYX_PHONE_NUMBER,
          to: formattedPhone,
          webhook_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook\`,
          webhook_url_method: 'POST',
          ai_agent_id: aiSession.sessionId, // Use AI session ID
          ai_agent_config: {
            greeting: \`Hello! This is \${businessName}. How can I help you today?\`,
            voice: 'alloy',
            language: 'en-US'
          }
        })
      });`
      );
      
      fs.writeFileSync(apiPath, finalContent);
      
    } else {
      
    }
  } else {
    
  }
}

// 2. Fix the demo conversation API to properly connect to OpenAI
function fixDemoConversationAPI() {
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  
  if (fs.existsSync(apiPath)) {
    let content = fs.readFileSync(apiPath, 'utf8');
    
    // Check if it's properly connected to OpenAI
    if (!content.includes('OPENAI_API_KEY') || !content.includes('chat/completions')) {
      
      
      const fixedContent = `import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { businessType, businessName, services, hours } = await request.json();
    
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        message: 'Please configure your OpenAI API key in the environment variables'
      }, { status: 500 });
    }
    
    // Create AI conversation session with proper business context
    const systemPrompt = \`You are a professional AI receptionist for \${businessName || 'a service business'}.
    
Business Information:
- Name: \${businessName || 'Service Business'}
- Type: \${businessType || 'Service'}
- Services: \${services || 'General services'}
- Hours: \${hours || 'Standard business hours'}

Your responsibilities:
1. Answer questions about services and pricing professionally
2. Schedule appointments when requested
3. Take detailed messages for the business owner
4. Provide accurate contact information
5. Be helpful, professional, and friendly
6. Ask for contact information when appropriate

Important guidelines:
- Always be polite and professional
- Ask clarifying questions when needed
- Don't make promises about specific pricing without consulting the owner
- If you don't know something, say so and offer to have someone call back
- Keep responses conversational but informative
- End calls politely and confirm next steps\`;

    const sessionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Hello, I need help with my business.'
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json();
      throw new Error(\`OpenAI API error: \${errorData.error?.message || 'Unknown error'}\`);
    }
    
    const sessionData = await sessionResponse.json();
    
    return NextResponse.json({
      success: true,
      sessionId: \`demo_\${Date.now()}\`,
      message: 'AI conversation session created',
      aiResponse: sessionData.choices[0].message.content,
      businessName: businessName,
      businessType: businessType
    });
    
  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create AI conversation',
      details: error.message 
    }, { status: 500 });
  }
}`;
      
      fs.writeFileSync(apiPath, fixedContent);
      
    } else {
      
    }
  } else {
    
  }
}

// 3. Check if the Telnyx webhook is properly configured
function checkTelnyxWebhook() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
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
      'NEXT_PUBLIC_APP_URL'
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

// Run all fixes


fixClickToCallAPI();
fixDemoConversationAPI();
checkTelnyxWebhook();
checkEnvironmentVariables();













const path = require('path');



// 1. Fix the click-to-call API to use real AI services instead of hardcoded demo data
function fixClickToCallAPI() {
  const apiPath = 'app/api/click-to-call/initiate/route.ts';
  
  if (fs.existsSync(apiPath)) {
    let content = fs.readFileSync(apiPath, 'utf8');
    
    // Check if it's using hardcoded demo data
    if (content.includes('00000000-0000-0000-0000-000000000001')) {
      
      
      // Replace hardcoded demo business with real AI connection
      const fixedContent = content.replace(
        /\/\/ Create or get demo business and agent for click-to-call[\s\S]*?const agentId = '00000000-0000-0000-0000-000000000002'[\s\S]*?\/\/ Check if demo business exists, if not create it[\s\S]*?const { data: existingBusiness } = await supabaseAdmin[\s\S]*?\.single\(\)/,
        `// Create AI conversation session for demo call
      const aiSessionResponse = await fetch(\`\${process.env.NEXT_PUBLIC_APP_URL}/api/ai/conversation-demo\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessType: businessType || 'HVAC',
          businessName: businessName,
          services: services,
          hours: hours
        })
      });
      
      if (!aiSessionResponse.ok) {
        throw new Error('Failed to create AI session');
      }
      
      const aiSession = await aiSessionResponse.json();
      
      if (!aiSession.success) {
        throw new Error(aiSession.error || 'Failed to create AI session');
      }`
      );
      
      // Also fix the Telnyx call creation to use real AI
      const finalContent = fixedContent.replace(
        /\/\/ Create Telnyx call with AI agent[\s\S]*?const callResponse = await fetch[\s\S]*?}/,
        `// Create Telnyx call with AI agent
      const callResponse = await fetch('https://api.telnyx.com/v2/calls', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${process.env.TELNYX_API_KEY}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.TELNYX_PHONE_NUMBER,
          to: formattedPhone,
          webhook_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook\`,
          webhook_url_method: 'POST',
          ai_agent_id: aiSession.sessionId, // Use AI session ID
          ai_agent_config: {
            greeting: \`Hello! This is \${businessName}. How can I help you today?\`,
            voice: 'alloy',
            language: 'en-US'
          }
        })
      });`
      );
      
      fs.writeFileSync(apiPath, finalContent);
      
    } else {
      
    }
  } else {
    
  }
}

// 2. Fix the demo conversation API to properly connect to OpenAI
function fixDemoConversationAPI() {
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  
  if (fs.existsSync(apiPath)) {
    let content = fs.readFileSync(apiPath, 'utf8');
    
    // Check if it's properly connected to OpenAI
    if (!content.includes('OPENAI_API_KEY') || !content.includes('chat/completions')) {
      
      
      const fixedContent = `import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { businessType, businessName, services, hours } = await request.json();
    
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        message: 'Please configure your OpenAI API key in the environment variables'
      }, { status: 500 });
    }
    
    // Create AI conversation session with proper business context
    const systemPrompt = \`You are a professional AI receptionist for \${businessName || 'a service business'}.
    
Business Information:
- Name: \${businessName || 'Service Business'}
- Type: \${businessType || 'Service'}
- Services: \${services || 'General services'}
- Hours: \${hours || 'Standard business hours'}

Your responsibilities:
1. Answer questions about services and pricing professionally
2. Schedule appointments when requested
3. Take detailed messages for the business owner
4. Provide accurate contact information
5. Be helpful, professional, and friendly
6. Ask for contact information when appropriate

Important guidelines:
- Always be polite and professional
- Ask clarifying questions when needed
- Don't make promises about specific pricing without consulting the owner
- If you don't know something, say so and offer to have someone call back
- Keep responses conversational but informative
- End calls politely and confirm next steps\`;

    const sessionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Hello, I need help with my business.'
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json();
      throw new Error(\`OpenAI API error: \${errorData.error?.message || 'Unknown error'}\`);
    }
    
    const sessionData = await sessionResponse.json();
    
    return NextResponse.json({
      success: true,
      sessionId: \`demo_\${Date.now()}\`,
      message: 'AI conversation session created',
      aiResponse: sessionData.choices[0].message.content,
      businessName: businessName,
      businessType: businessType
    });
    
  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create AI conversation',
      details: error.message 
    }, { status: 500 });
  }
}`;
      
      fs.writeFileSync(apiPath, fixedContent);
      
    } else {
      
    }
  } else {
    
  }
}

// 3. Check if the Telnyx webhook is properly configured
function checkTelnyxWebhook() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
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
      'NEXT_PUBLIC_APP_URL'
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

// Run all fixes


fixClickToCallAPI();
fixDemoConversationAPI();
checkTelnyxWebhook();
checkEnvironmentVariables();












