const fs = require('fs');
const path = require('path');

console.log('🤖 Fixing specific AI call functionality issues...\n');

// 1. Check if the demo call API exists and is properly connected
function checkDemoCallAPI() {
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  
  if (!fs.existsSync(apiPath)) {
    console.log('❌ Demo call API missing - creating it...');
    
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
    console.log('✅ Created demo call API');
  } else {
    console.log('✅ Demo call API exists');
  }
}

// 2. Check if the demo page has proper call functionality
function checkDemoPage() {
  const demoPagePath = 'app/demo/page.tsx';
  
  if (fs.existsSync(demoPagePath)) {
    let content = fs.readFileSync(demoPagePath, 'utf8');
    
    // Check if the demo call button is properly connected
    if (content.includes('Start Demo Call') || content.includes('Call AI Receptionist')) {
      console.log('✅ Demo call button found');
      
      // Check if there's a proper onClick handler
      if (!content.includes('onClick') && content.includes('button')) {
        console.log('❌ Demo call button not connected - needs manual fix');
        console.log('   Add onClick handler to the demo call button');
      } else {
        console.log('✅ Demo call button appears to be connected');
      }
    } else {
      console.log('❌ Demo call button not found');
    }
  } else {
    console.log('❌ Demo page not found');
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
      console.log('❌ Missing environment variables:', missingVars.join(', '));
      console.log('   Add these to your .env.local file:');
      missingVars.forEach(varName => {
        console.log(`   ${varName}=your_${varName.toLowerCase()}_here`);
      });
    } else {
      console.log('✅ Environment variables configured');
    }
  } else {
    console.log('❌ .env.local file not found');
    console.log('   Create .env.local with your API keys');
  }
}

// 4. Check the main conversation API
function checkMainConversationAPI() {
  const apiPath = 'app/api/ai/conversation/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('fetch')) {
      console.log('✅ Main conversation API appears to be connected');
    } else {
      console.log('❌ Main conversation API not properly connected to AI');
    }
  } else {
    console.log('❌ Main conversation API not found');
  }
}

// Run all checks
console.log('🔍 Checking AI call functionality...\n');

checkDemoCallAPI();
checkDemoPage();
checkEnvironmentVariables();
checkMainConversationAPI();

console.log('\n📋 SUMMARY:');
console.log('1. ✅ Demo call API created/verified');
console.log('2. 🔍 Demo page needs manual review');
console.log('3. 🔍 Environment variables need to be configured');
console.log('4. 🔍 Main conversation API needs verification');
console.log('\n🚀 NEXT STEPS:');
console.log('1. Add your OpenAI API key to .env.local');
console.log('2. Add your Telnyx API key to .env.local');
console.log('3. Test the demo call functionality');
console.log('4. Check that the demo call button is properly connected');

const path = require('path');

console.log('🤖 Fixing specific AI call functionality issues...\n');

// 1. Check if the demo call API exists and is properly connected
function checkDemoCallAPI() {
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  
  if (!fs.existsSync(apiPath)) {
    console.log('❌ Demo call API missing - creating it...');
    
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
    console.log('✅ Created demo call API');
  } else {
    console.log('✅ Demo call API exists');
  }
}

// 2. Check if the demo page has proper call functionality
function checkDemoPage() {
  const demoPagePath = 'app/demo/page.tsx';
  
  if (fs.existsSync(demoPagePath)) {
    let content = fs.readFileSync(demoPagePath, 'utf8');
    
    // Check if the demo call button is properly connected
    if (content.includes('Start Demo Call') || content.includes('Call AI Receptionist')) {
      console.log('✅ Demo call button found');
      
      // Check if there's a proper onClick handler
      if (!content.includes('onClick') && content.includes('button')) {
        console.log('❌ Demo call button not connected - needs manual fix');
        console.log('   Add onClick handler to the demo call button');
      } else {
        console.log('✅ Demo call button appears to be connected');
      }
    } else {
      console.log('❌ Demo call button not found');
    }
  } else {
    console.log('❌ Demo page not found');
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
      console.log('❌ Missing environment variables:', missingVars.join(', '));
      console.log('   Add these to your .env.local file:');
      missingVars.forEach(varName => {
        console.log(`   ${varName}=your_${varName.toLowerCase()}_here`);
      });
    } else {
      console.log('✅ Environment variables configured');
    }
  } else {
    console.log('❌ .env.local file not found');
    console.log('   Create .env.local with your API keys');
  }
}

// 4. Check the main conversation API
function checkMainConversationAPI() {
  const apiPath = 'app/api/ai/conversation/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('fetch')) {
      console.log('✅ Main conversation API appears to be connected');
    } else {
      console.log('❌ Main conversation API not properly connected to AI');
    }
  } else {
    console.log('❌ Main conversation API not found');
  }
}

// Run all checks
console.log('🔍 Checking AI call functionality...\n');

checkDemoCallAPI();
checkDemoPage();
checkEnvironmentVariables();
checkMainConversationAPI();

console.log('\n📋 SUMMARY:');
console.log('1. ✅ Demo call API created/verified');
console.log('2. 🔍 Demo page needs manual review');
console.log('3. 🔍 Environment variables need to be configured');
console.log('4. 🔍 Main conversation API needs verification');
console.log('\n🚀 NEXT STEPS:');
console.log('1. Add your OpenAI API key to .env.local');
console.log('2. Add your Telnyx API key to .env.local');
console.log('3. Test the demo call functionality');
console.log('4. Check that the demo call button is properly connected');
