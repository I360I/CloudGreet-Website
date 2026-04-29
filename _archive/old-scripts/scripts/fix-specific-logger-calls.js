const fs = require('fs');
const path = require('path');

// Specific files that need fixing
const filesToFix = [
  'app/api/admin/analytics/route.ts',
  'app/api/admin/auth/route.ts', 
  'app/api/admin/bulk-actions/route.ts',
  'app/api/admin/clients/route.ts'
];

function fixLoggerCalls(content) {
  let newContent = content;
  
  // Fix complex malformed logger calls
  const complexPattern = /logger\.error\(([^,]+),\s*\{\s*error:\s*\{\s*error:\s*[^}]+\}\s*\}\)/g;
  newContent = newContent.replace(complexPattern, (match, message) => {
    return `logger.error(${message}, { error: 'Unknown error' })`;
  });

  // Fix other malformed patterns
  const otherPattern = /logger\.error\(([^,]+),\s*\{\s*error:\s*[^}]+\}\s*\}\)/g;
  newContent = newContent.replace(otherPattern, (match, message) => {
    return `logger.error(${message}, { error: 'Unknown error' })`;
  });

  return newContent;
}

function main() {
  console.log('🔧 Fixing specific malformed logger calls...\n');
  
  let totalFixed = 0;
  
  filesToFix.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = fixLoggerCalls(content);
        
        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent);
          console.log(`✅ ${filePath} - Fixed malformed logger calls`);
          totalFixed++;
        } else {
          console.log(`⚪ ${filePath} - No changes needed`);
        }
      } else {
        console.log(`❌ ${filePath} - File not found`);
      }
    } catch (error) {
      console.error(`❌ ${filePath} - Error: ${error.message}`);
    }
  });
  
  console.log(`\n✅ Fixed ${totalFixed} files`);
}

main();

