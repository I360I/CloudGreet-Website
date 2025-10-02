// TARGETED FIX FOR SPECIFIC LOGGER.ERROR PATTERNS
const fs = require('fs');
const path = require('path');

function fixSpecificPatterns(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fixes = [];
    
    // Fix pattern: logger.error with extra closing parentheses
    // logger.error("message", { ... })))))
    const pattern1 = /logger\.error\(([^,]+),\s*(\{[^}]*\})\s*\)\)\)\)/g;
    content = content.replace(pattern1, (match, message, obj) => {
      fixes.push(`Fixed extra closing parentheses: ${message.trim()}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    // Fix pattern: logger.error with missing closing parenthesis
    // logger.error("message", { ... }
    const pattern2 = /logger\.error\(([^,]+),\s*(\{[^}]*\})\s*$/gm;
    content = content.replace(pattern2, (match, message, obj) => {
      fixes.push(`Fixed missing closing parenthesis: ${message.trim()}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    // Fix pattern: logger.error with error as Error
    const pattern3 = /logger\.error\(([^,]+),\s*\{\s*error:\s*([^,]+)\s+as\s+Error,([^}]*)\}/g;
    content = content.replace(pattern3, (match, message, errorVar, rest) => {
      fixes.push(`Fixed error type assertion: ${message.trim()}`);
      return `logger.error(${message}, { error: ${errorVar} instanceof Error ? ${errorVar}.message : 'Unknown error',${rest}})`;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${fixes.length} patterns in: ${filePath}`);
      fixes.forEach(fix => console.log(`   - ${fix}`));
      return fixes.length;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

// Get list of files with logger.error issues
const filesWithErrors = [
  'app/api/stripe/webhook/route.ts',
  'app/api/stripe/customer-portal/route.ts',
  'app/api/stripe/create-customer/route.ts',
  'app/api/stripe/create-subscription/route.ts',
  'app/api/sms/forward/route.ts',
  'app/api/quotes/route.ts',
  'app/api/quotes/generate/route.ts',
  'app/api/promo/validate/route.ts',
  'app/api/promo/apply/route.ts',
  'app/api/pricing/rules/route.ts',
  'app/api/onboarding/complete/route.ts',
  'app/api/notifications/send/route.ts',
  'app/api/dashboard/data/route.ts',
  'app/api/calls/history/route.ts',
  'app/api/calls/transcripts/route.ts',
  'app/api/business/profile/route.ts',
  'app/api/billing/per-booking/route.ts',
  'app/api/automation/follow-up/route.ts',
  'app/api/calendar/callback/route.ts',
  'app/api/calendar/connect/route.ts',
  'app/api/appointments/list/route.ts',
  'app/api/ai-agent/test/route.ts',
  'app/api/ai-agent/analytics/route.ts',
  'app/api/admin/stats/route.ts',
  'app/api/admin/clients/route.ts',
  'lib/monitoring.ts'
];

console.log('🔧 TARGETED SYNTAX ERROR FIXER');
console.log('================================');
console.log('Fixing specific logger.error patterns...');

let totalFixes = 0;
let filesFixed = 0;

filesWithErrors.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const fixes = fixSpecificPatterns(filePath);
    if (fixes > 0) {
      totalFixes += fixes;
      filesFixed++;
    }
  }
});

console.log(`\n📊 RESULTS:`);
console.log(`   Total patterns fixed: ${totalFixes}`);
console.log(`   Files modified: ${filesFixed}`);

if (totalFixes > 0) {
  console.log(`\n✅ SUCCESS: Fixed ${totalFixes} patterns across ${filesFixed} files`);
} else {
  console.log('\n✅ No patterns found to fix!');
}
