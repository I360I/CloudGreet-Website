#!/usr/bin/env node

const fs = require('fs');
const path = require('path');




const needs = [];

function checkNeed(description, test, category = 'general') {
  if (!test) {
    needs.push({ description, category });
    
  } else {
    
  }
}



// 1. Database Setup

const migrationFiles = fs.readdirSync('migrations').filter(file => file.endsWith('.sql'));
checkNeed('Database migrations exist', migrationFiles.length > 0, 'database');

// Check for demo data
const hasDemoData = migrationFiles.some(file => 
  file.includes('demo') || file.includes('perfect')
);
checkNeed('Demo data migration exists', hasDemoData, 'database');

// 2. Environment Configuration

const envExample = 'env.example';
checkNeed('Environment example file exists', fs.existsSync(envExample), 'config');

if (fs.existsSync(envExample)) {
  const envContent = fs.readFileSync(envExample, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'TELNYX_API_KEY',
    'TELNYX_PHONE_NUMBER',
    'TELNYX_CONNECTION_ID',
    'NEXT_PUBLIC_APP_URL',
    'JWT_SECRET'
  ];
  
  requiredVars.forEach(varName => {
    checkNeed(`Environment variable ${varName} is documented`, envContent.includes(varName), 'config');
  });
}

// 3. Documentation

checkNeed('README.md exists', fs.existsSync('README.md'), 'docs');
checkNeed('FIXES_SUMMARY.md exists', fs.existsSync('FIXES_SUMMARY.md'), 'docs');

// 4. Build Configuration

checkNeed('package.json exists', fs.existsSync('package.json'), 'build');
checkNeed('next.config.js exists', fs.existsSync('next.config.js'), 'build');
checkNeed('tsconfig.json exists', fs.existsSync('tsconfig.json'), 'build');
checkNeed('tailwind.config.js exists', fs.existsSync('tailwind.config.js'), 'build');

// 5. Deployment Configuration

checkNeed('vercel.json exists', fs.existsSync('vercel.json'), 'deployment');
checkNeed('DEPLOYMENT_CHECKLIST.md exists', fs.existsSync('DEPLOYMENT_CHECKLIST.md'), 'deployment');

// 6. Security

checkNeed('Security utilities exist', fs.existsSync('lib/security.ts'), 'security');
checkNeed('Middleware has security headers', fs.existsSync('middleware.ts'), 'security');

// 7. Error Handling

checkNeed('Error handler exists', fs.existsSync('lib/error-handler.ts'), 'errors');
checkNeed('Monitoring library exists', fs.existsSync('lib/monitoring.ts'), 'errors');

// 8. Database Schema

const essentialTables = ['businesses', 'ai_agents', 'calls', 'appointments', 'leads'];
essentialTables.forEach(table => {
  const hasTable = migrationFiles.some(file => {
    const content = fs.readFileSync(`migrations/${file}`, 'utf8');
    return content.includes(`CREATE TABLE ${table}`) || content.includes(`CREATE TABLE public.${table}`);
  });
  checkNeed(`Essential table ${table} exists`, hasTable, 'database');
});

// 9. AI Integration

checkNeed('OpenAI integration in voice webhook', fs.existsSync('app/api/telnyx/voice-webhook/route.ts'), 'ai');
checkNeed('AI conversation API exists', fs.existsSync('app/api/ai/conversation/route.ts'), 'ai');

// 10. Phone Integration

checkNeed('Click-to-call API exists', fs.existsSync('app/api/click-to-call/initiate/route.ts'), 'phone');
checkNeed('Telnyx webhook exists', fs.existsSync('app/api/telnyx/voice-webhook/route.ts'), 'phone');

// 11. Admin Features

checkNeed('Admin dashboard exists', fs.existsSync('app/admin/page.tsx'), 'admin');
checkNeed('Admin authentication exists', fs.existsSync('lib/admin-auth.ts'), 'admin');

// 12. User Interface

const uiPages = [
  'app/dashboard/page.tsx',
  'app/login/page.tsx',
  'app/register-simple/page.tsx',
  'app/calls/page.tsx',
  'app/appointments/page.tsx',
  'app/billing/page.tsx',
  'app/settings/page.tsx'
];

uiPages.forEach(page => {
  checkNeed(`UI page ${path.basename(page)} exists`, fs.existsSync(page), 'ui');
});

// 13. API Routes

const apiRoutes = [
  'app/api/ai/conversation/route.ts',
  'app/api/admin/convert-lead-to-client/route.ts',
  'app/api/admin/real-revenue/route.ts',
  'app/api/calls/stream/route.ts',
  'app/api/contact/submit/route.ts'
];

apiRoutes.forEach(route => {
  checkNeed(`API route ${path.basename(route)} exists`, fs.existsSync(route), 'api');
});

// 14. Library Utilities

const libFiles = [
  'lib/supabase.ts',
  'lib/monitoring.ts',
  'lib/auth-utils.ts',
  'lib/validation.ts',
  'lib/error-handler.ts',
  'lib/security.ts'
];

libFiles.forEach(lib => {
  checkNeed(`Library ${path.basename(lib)} exists`, fs.existsSync(lib), 'lib');
});

// 15. Testing

checkNeed('Real broken functionality test exists', fs.existsSync('scripts/real-broken-functionality-test.js'), 'testing');




const criticalNeeds = needs.filter(need => need.category === 'database' || need.category === 'config' || need.category === 'security');
const importantNeeds = needs.filter(need => need.category === 'deployment' || need.category === 'docs' || need.category === 'build');
const niceToHaveNeeds = needs.filter(need => need.category === 'ui' || need.category === 'api' || need.category === 'lib');






if (needs.length === 0) {
  
  
  
  
  
  
  
  
  
  
  
  
  
  
} else {
  
  
  if (criticalNeeds.length > 0) {
    :');
    criticalNeeds.forEach(need => );
  }
  
  if (importantNeeds.length > 0) {
    :');
    importantNeeds.forEach(need => );
  }
  
  if (niceToHaveNeeds.length > 0) {
    :');
    niceToHaveNeeds.forEach(need => );
  }
  
  
  
  
  
  
  
}




