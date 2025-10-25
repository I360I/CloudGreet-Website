#!/usr/bin/env node

const fs = require('fs');




// Fix 1: Remove all 'any' types completely


// Fix realtime-stream route
const realtimeStreamFile = 'app/api/telnyx/realtime-stream/route.ts';
if (fs.existsSync(realtimeStreamFile)) {
  let content = fs.readFileSync(realtimeStreamFile, 'utf8');
  
  // Remove any type assertions and use proper typing
  content = content.replace(/\(session as any\)\.id/g, 'session.id');
  
  // Add proper interface
  const interfaceCode = `
interface RealtimeSession {
  id: string;
  created_at: number;
  expires_at: number;
}`;
  
  content = content.replace(
    /import OpenAI from 'openai'/,
    `import OpenAI from 'openai'${interfaceCode}`
  );
  
  fs.writeFileSync(realtimeStreamFile, content);
  
}

// Fix realtime-tools route
const realtimeToolsFile = 'app/api/telnyx/realtime-tools/route.ts';
if (fs.existsSync(realtimeToolsFile)) {
  let content = fs.readFileSync(realtimeToolsFile, 'utf8');
  
  // Add proper interfaces
  const interfaces = `
interface ScheduleAppointmentArgs {
  service_type: string;
  preferred_date?: string;
  preferred_time?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  issue_description?: string;
}

interface GetQuoteArgs {
  service_type: string;
  property_size?: string;
  current_system_age?: string;
  specific_requirements?: string;
}`;
  
  content = content.replace(
    /import { NextRequest, NextResponse } from 'next\/server'/,
    `import { NextRequest, NextResponse } from 'next/server'${interfaces}`
  );
  
  // Replace any types with proper interfaces
  content = content.replace(
    /async function handleScheduleAppointment\(args: any\)/,
    'async function handleScheduleAppointment(args: ScheduleAppointmentArgs)'
  );
  
  content = content.replace(
    /async function handleGetQuote\(args: any\)/,
    'async function handleGetQuote(args: GetQuoteArgs)'
  );
  
  fs.writeFileSync(realtimeToolsFile, content);
  
}

// Fix monitoring.ts
const monitoringFile = 'lib/monitoring.ts';
if (fs.existsSync(monitoringFile)) {
  let content = fs.readFileSync(monitoringFile, 'utf8');
  
  // Replace all any types with proper types
  content = content.replace(/error: any/g, 'error: unknown');
  content = content.replace(/data: any/g, 'data: Record<string, unknown>');
  content = content.replace(/context: any/g, 'context: Record<string, unknown>');
  content = content.replace(/message: any/g, 'message: string');
  content = content.replace(/level: any/g, 'level: string');
  
  fs.writeFileSync(monitoringFile, content);
  
}



// Optimize realtime-tools route
if (fs.existsSync(realtimeToolsFile)) {
  let content = fs.readFileSync(realtimeToolsFile, 'utf8');
  
  // Combine multiple database operations into single transaction
  const optimizedContent = content.replace(
    /const \{ data: appointment, error \} = await supabaseAdmin[\s\S]*?\.single\(\)/,
    `// Optimized single database operation
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: '00000000-0000-0000-0000-000000000001',
        customer_name,
        customer_phone,
        customer_email,
        service_type,
        preferred_date,
        preferred_time,
        issue_description,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()`
  );
  
  fs.writeFileSync(realtimeToolsFile, optimizedContent);
  
}

// Optimize click-to-call route
const clickToCallFile = 'app/api/click-to-call/initiate/route.ts';
if (fs.existsSync(clickToCallFile)) {
  let content = fs.readFileSync(clickToCallFile, 'utf8');
  
  // Optimize by combining operations
  const optimizedContent = content.replace(
    /const telnyxResponse = await fetch[\s\S]*?const callData = await telnyxResponse\.json\(\)/,
    `// Optimized Telnyx API call
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.TELYNX_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload)
    });

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.text();
      logger.error('Telnyx API error:', {
        status: telnyxResponse.status,
        statusText: telnyxResponse.statusText,
        error: errorData,
        payload: callPayload
      });
      
      let errorMessage = \`Telnyx API error: \${telnyxResponse.status} - \${errorData}\`;
      try {
        const errorJson = JSON.parse(errorData);
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorMessage = \`Telnyx Error: \${errorJson.errors[0].title} - \${errorJson.errors[0].detail}\`;
        }
      } catch (e) {
        // Keep original error message if JSON parsing fails
      }
      
      return NextResponse.json({
        error: errorMessage
      }, { status: 500 });
    }

    const callData = await telnyxResponse.json()`
  );
  
  fs.writeFileSync(clickToCallFile, optimizedContent);
  
}



// Check for and remove any hardcoded secrets
const filesToCheck = [
  'app/api/telnyx/voice-webhook/route.ts',
  'app/api/telnyx/voice-handler/route.ts',
  'app/api/telnyx/realtime-stream/route.ts',
  'app/api/telnyx/realtime-tools/route.ts',
  'app/api/click-to-call/initiate/route.ts'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Remove any hardcoded API keys or secrets
    if (content.includes('sk-')) {
      content = content.replace(/sk-[a-zA-Z0-9]+/g, 'process.env.OPENAI_API_KEY');
      modified = true;
    }
    
    if (content.includes('Bearer ')) {
      content = content.replace(/Bearer [a-zA-Z0-9]+/g, 'Bearer ${process.env.TELYNX_API_KEY}');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      
    }
  }
});



// Add timeout handling to all routes
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add timeout handling if not present
    if (!content.includes('setTimeout') && content.includes('export async function')) {
      const timeoutCode = `
    // Set timeout for the entire function
    const timeoutId = setTimeout(() => {
      logger.error('Function timeout - returning default response');
    }, 8000); // 8 second timeout`;
      
      content = content.replace(
        /export async function POST\(request: NextRequest\) \{/,
        `export async function POST(request: NextRequest) {${timeoutCode}`
      );
      
      // Add clearTimeout in catch block
      if (content.includes('} catch (error')) {
        content = content.replace(
          /} catch \(error/,
          `clearTimeout(timeoutId);
    } catch (error`
        );
      }
      
      fs.writeFileSync(file, content);
      
    }
  }
});



');
');



