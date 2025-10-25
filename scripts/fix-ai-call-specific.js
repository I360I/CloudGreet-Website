const fs = require('fs');
const path = require('path');



// 1. Check if the demo call API exists and is properly connected
function checkDemoCallAPI() {
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  
  if (!fs.existsSync(apiPath)) {
    
    
    // Create the directory
    const apiDir = 'app/api/ai/conversation-demo';
    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }
    
    // Create the API file
    const apiContent = `import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { businessType } = await request.json();
    
    // Check if AI services are configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        message: 'Please configure your OpenAI API key in the environment variables'
      }, { status: 500 });
    }
    
    // Create AI conversation session
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
            content: \`You are a professional AI receptionist for a \${businessType} business. 
            Answer calls professionally, qualify leads, and book appointments. 
            Always be helpful and ask for contact information.\`
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
      throw new Error('Failed to create AI session');
    }
    
    const sessionData = await sessionResponse.json();
    
    return NextResponse.json({
      success: true,
      sessionId: \`demo_\${Date.now()}\`,
      message: 'AI conversation session created',
      aiResponse: sessionData.choices[0].message.content
    });
    
  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create AI conversation',
      details: error.message 
    }, { status: 500 });
  }
}`;
    
    fs.writeFileSync(apiPath, apiContent);
    
  } else {
    
  }
}

// 2. Check if the demo page has proper call functionality
function checkDemoPage() {
  const demoPagePath = 'app/demo/page.tsx';
  
  if (fs.existsSync(demoPagePath)) {
    let content = fs.readFileSync(demoPagePath, 'utf8');
    
    // Check if the demo call button is properly connected
    if (content.includes('Start Demo Call') || content.includes('Call AI Receptionist')) {
      
      
      // Check if there's a proper onClick handler
      if (!content.includes('onClick') && content.includes('button')) {
        
        
      } else {
        
      }
    } else {
      
    }
  } else {
    
  }
}

// 3. Check environment variables
function checkEnvironmentVariables() {
  const envPath = '.env.local';
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = [
      'OPENAI_API_KEY',
      'TELNYX_API_KEY'
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

// 4. Check the main conversation API
function checkMainConversationAPI() {
  const apiPath = 'app/api/ai/conversation/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('fetch')) {
      
    } else {
      
    }
  } else {
    
  }
}

// Run all checks


checkDemoCallAPI();
checkDemoPage();
checkEnvironmentVariables();
checkMainConversationAPI();












const path = require('path');



// 1. Check if the demo call API exists and is properly connected
function checkDemoCallAPI() {
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  
  if (!fs.existsSync(apiPath)) {
    
    
    // Create the directory
    const apiDir = 'app/api/ai/conversation-demo';
    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }
    
    // Create the API file
    const apiContent = `import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { businessType } = await request.json();
    
    // Check if AI services are configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        message: 'Please configure your OpenAI API key in the environment variables'
      }, { status: 500 });
    }
    
    // Create AI conversation session
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
            content: \`You are a professional AI receptionist for a \${businessType} business. 
            Answer calls professionally, qualify leads, and book appointments. 
            Always be helpful and ask for contact information.\`
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
      throw new Error('Failed to create AI session');
    }
    
    const sessionData = await sessionResponse.json();
    
    return NextResponse.json({
      success: true,
      sessionId: \`demo_\${Date.now()}\`,
      message: 'AI conversation session created',
      aiResponse: sessionData.choices[0].message.content
    });
    
  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create AI conversation',
      details: error.message 
    }, { status: 500 });
  }
}`;
    
    fs.writeFileSync(apiPath, apiContent);
    
  } else {
    
  }
}

// 2. Check if the demo page has proper call functionality
function checkDemoPage() {
  const demoPagePath = 'app/demo/page.tsx';
  
  if (fs.existsSync(demoPagePath)) {
    let content = fs.readFileSync(demoPagePath, 'utf8');
    
    // Check if the demo call button is properly connected
    if (content.includes('Start Demo Call') || content.includes('Call AI Receptionist')) {
      
      
      // Check if there's a proper onClick handler
      if (!content.includes('onClick') && content.includes('button')) {
        
        
      } else {
        
      }
    } else {
      
    }
  } else {
    
  }
}

// 3. Check environment variables
function checkEnvironmentVariables() {
  const envPath = '.env.local';
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = [
      'OPENAI_API_KEY',
      'TELNYX_API_KEY'
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

// 4. Check the main conversation API
function checkMainConversationAPI() {
  const apiPath = 'app/api/ai/conversation/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('fetch')) {
      
    } else {
      
    }
  } else {
    
  }
}

// Run all checks


checkDemoCallAPI();
checkDemoPage();
checkEnvironmentVariables();
checkMainConversationAPI();











