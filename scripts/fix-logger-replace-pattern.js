const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing logger .replace() patterns...\n');

const filesToFix = [
  'app/api/appointments/list/route.ts',
  'app/api/calls/realtime/route.ts',
  'app/api/apollo-killer/search-enrich/route.ts',
  'app/api/apollo-killer/outreach/sms/route.ts',
  'app/api/apollo-killer/outreach/email/route.ts',
  'app/api/admin/bulk-actions/route.ts',
  'app/api/contact/submit/route.ts',
  'app/api/campaigns/performance/route.ts',
  'app/api/dashboard/data/route.ts',
  'app/api/calls/route.ts',
  'app/api/business/profile/route.ts',
  'app/api/calls/history/route.ts',
  'app/api/calendar/callback/route.ts',
  'app/api/dashboard/quick-start/route.ts',
  'app/api/calendar/connect/route.ts',
  'app/api/admin/customization/route.ts',
  'app/api/calls/transcripts/route.ts',
  'app/api/ai-agent/test/route.ts',
  'app/api/admin/test-runner/route.ts',
  'app/api/admin/test-features/route.ts'
];

let updatedCount = 0;

for (const file of filesToFix) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Replace all variations of the malformed pattern
    content = content.replace(
      /error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\s+instanceof\s+Error\s+\?\s+\{[^}]*error:\s+error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown\s+error'/gs,
      "error instanceof Error ? error.message : 'Unknown error'"
    );

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed ${file}`);
      updatedCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n✅ Updated ${updatedCount} files`);

if (updatedCount > 0) {
  console.log('\n📋 Logger .replace() Patterns Fixed!');
} else {
  console.log('\n📋 No issues found to fix.');
}


