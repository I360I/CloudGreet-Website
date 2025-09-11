// Script to fix all incorrect import paths
const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/api/calls/recording/route.ts',
  'app/api/azure-phone-integration/route.ts',
  'app/api/admin/clients/route.ts',
  'app/api/admin/stats/route.ts',
  'app/api/customers/route.ts',
  'app/api/system-status/route.ts',
  'app/api/stripe/create-subscription/route.ts',
  'app/api/stripe/webhook/route.ts',
  'app/api/status-check/route.ts',
  'app/api/stripe/charge-booking/route.ts',
  'app/api/stripe/create-customer/route.ts',
  'app/api/security/compliance/route.ts',
  'app/api/marketing/lead-magnets/route.ts',
  'app/api/retell-stats/route.ts',
  'app/api/purchase-phone-number/route.ts',
  'app/api/send-onboarding/route.ts',
  'app/api/customers/[id]/route.ts',
  'app/api/create-subscription/route.ts',
  'app/api/create-retell-agent/route.ts',
  'app/api/appointments/availability/route.ts',
  'app/api/calendar/settings/route.ts',
  'app/api/business/intelligence/route.ts',
  'app/api/acquisition/funnel/route.ts',
  'app/api/bookings/route.ts',
  'app/api/live-calls/route.ts',
  'app/api/phone-integration/route.ts',
  'app/api/call-logs/route.ts',
  'app/api/get-business-stats/route.ts',
  'app/api/create-azure-voice-agent/route.ts',
  'app/api/send-notification/route.ts',
  'app/api/notifications/route.ts',
  'app/api/send-test-email/route.ts',
  'app/api/get-user-data/route.ts'
];

function fixImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix incorrect import paths
    const replacements = [
      // Fix session-middleware imports
      [/from ['\"]\.\.\/\.\.\/\.\.\/lib\/session-middleware['\"]/g, "from '../../../../lib/session-middleware'"],
      // Fix error-handler imports
      [/from ['\"]\.\.\/\.\.\/\.\.\/lib\/error-handler['\"]/g, "from '../../../../lib/error-handler'"],
      // Fix supabase imports
      [/from ['\"]\.\.\/\.\.\/\.\.\/lib\/supabase['\"]/g, "from '../../../../lib/supabase'"],
      // Fix cache imports
      [/from ['\"]\.\.\/\.\.\/\.\.\/lib\/cache['\"]/g, "from '../../../../lib/cache'"],
      // Fix validation imports
      [/from ['\"]\.\.\/\.\.\/\.\.\/lib\/validation['\"]/g, "from '../../../../lib/validation'"],
      // Fix security imports
      [/from ['\"]\.\.\/\.\.\/\.\.\/lib\/security['\"]/g, "from '../../../../lib/security'"],
      // Fix business-types imports
      [/from ['\"]\.\.\/\.\.\/\.\.\/lib\/business-types['\"]/g, "from '../../../../lib/business-types'"]
    ];

    replacements.forEach(([pattern, replacement]) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing import paths in all API files...\n');

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    fixImports(fullPath);
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log('\n🎉 Import path fixes completed!');
