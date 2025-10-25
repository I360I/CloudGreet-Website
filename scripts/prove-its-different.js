#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');






// 1. Show actual file contents (not just "fixed")



const realtimeStreamContent = fs.readFileSync('app/api/telnyx/realtime-stream/route.ts', 'utf8');
const anyTypesInStream = (realtimeStreamContent.match(/:\s*any\b|as\s+any\b/g) || []).length;
`);

const realtimeToolsContent = fs.readFileSync('app/api/telnyx/realtime-tools/route.ts', 'utf8');
const anyTypesInTools = (realtimeToolsContent.match(/:\s*any\b|as\s+any\b/g) || []).length;
`);

const monitoringContent = fs.readFileSync('lib/monitoring.ts', 'utf8');
const anyTypesInMonitoring = (monitoringContent.match(/:\s*any\b|as\s+any\b/g) || []).length;
`);

// 2. Show actual performance metrics



const awaitCountInTools = (realtimeToolsContent.match(/await\s+/g) || []).length;
`);

const clickToCallContent = fs.readFileSync('app/api/click-to-call/initiate/route.ts', 'utf8');
const awaitCountInClickToCall = (clickToCallContent.match(/await\s+/g) || []).length;
`);

// 3. Show actual security



const hardcodedSecrets = [
  ...realtimeStreamContent.match(/sk-[a-zA-Z0-9]+/g) || [],
  ...realtimeToolsContent.match(/sk-[a-zA-Z0-9]+/g) || [],
  ...clickToCallContent.match(/sk-[a-zA-Z0-9]+/g) || []
];
`);

const bearerTokens = [
  ...realtimeStreamContent.match(/Bearer\s+[a-zA-Z0-9]{20,}/g) || [],
  ...realtimeToolsContent.match(/Bearer\s+[a-zA-Z0-9]{20,}/g) || [],
  ...clickToCallContent.match(/Bearer\s+[a-zA-Z0-9]{20,}/g) || []
];
`);

// 4. Show actual database schema



const dbContent = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
const tableCount = (dbContent.match(/CREATE TABLE/g) || []).length;
const indexCount = (dbContent.match(/CREATE INDEX/g) || []).length;
const demoDataExists = dbContent.includes('CloudGreet Premium HVAC') && dbContent.includes('Sarah - Premium AI Receptionist');

`);
`);
`);

// 5. Show actual error handling



const files = [
  'app/api/telnyx/voice-webhook/route.ts',
  'app/api/telnyx/voice-handler/route.ts',
  'app/api/telnyx/realtime-stream/route.ts',
  'app/api/telnyx/realtime-tools/route.ts',
  'app/api/click-to-call/initiate/route.ts'
];

let tryCatchCount = 0;
let timeoutCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('try {') && content.includes('catch')) tryCatchCount++;
  if (content.includes('setTimeout') || content.includes('Promise.race')) timeoutCount++;
});

`);
`);

// 6. Show actual git status



try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  const uncommittedFiles = gitStatus.trim().split('\n').filter(line => line.trim()).length;
  `);
  
  const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' });
  }`);
} catch (error) {
  
}

// 7. Show actual file structure



const coreFiles = [
  'app/api/telnyx/voice-webhook/route.ts',
  'app/api/telnyx/voice-handler/route.ts',
  'app/api/telnyx/realtime-stream/route.ts',
  'app/api/telnyx/realtime-tools/route.ts',
  'app/api/click-to-call/initiate/route.ts',
  'migrations/perfect-database-setup.sql',
  'DEPLOYMENT_CHECKLIST.md'
];

const existingFiles = coreFiles.filter(file => fs.existsSync(file));
`);

// 8. Show actual verification results



// Run the accurate verification
try {
  const verificationOutput = execSync('node scripts/accurate-verification.js', { encoding: 'utf8' });
  const criticalMatch = verificationOutput.match(/🔥 CRITICAL: (\d+)\/(\d+) \((\d+)%\)/);
  const overallMatch = verificationOutput.match(/🎯 OVERALL: (\d+)\/(\d+) \((\d+)%\)/);
  
  if (criticalMatch) {
    `);
  }
  if (overallMatch) {
    `);
  }
} catch (error) {
  
}




:');










:');

');












');
');
');
');
');
');




