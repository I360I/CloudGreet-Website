const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing ALL logger issues with comprehensive approach...\n');

function fixAllLoggerIssues(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let hasChanges = false;

    // Pattern 1: Fix nested error objects - logger.error('msg', { error: { error: ... } })
    content = content.replace(
      /logger\.error\('([^']+)',\s*\{\s*error:\s*\{[^}]*error:\s*[^}]+\}\s*\}\)/gs,
      (match, message) => {
        hasChanges = true;
        return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error' })`;
      }
    );

    // Pattern 2: Fix malformed instanceof checks in middle of strings
    content = content.replace(
      /error\.message\.replace\([^)]+\)\s+instanceof\s+Error[^}]+\}/gs,
      () => {
        hasChanges = true;
        return "error instanceof Error ? error.message : 'Unknown error'";
      }
    );

    // Pattern 3: Fix request.url.includes('businessId' instanceof Error pattern
    content = content.replace(
      /request\.url\.includes\('businessId'\s+instanceof\s+Error[^}]+\}\s*\?/gs,
      () => {
        hasChanges = true;
        return "request.url.includes('businessId') ?";
      }
    );

    // Pattern 4: Fix leadIds.join(', ' instanceof Error pattern
    content = content.replace(
      /leadIds\.join\(',\s*'\s+instanceof\s+Error[^}]+\}/gs,
      () => {
        hasChanges = true;
        return "leadIds.join(', ')";
      }
    );

    // Pattern 5: Fix await logger.error patterns with nested error objects
    content = content.replace(
      /await\s+logger\.error\('([^']+)',\s*\{\s*error:\s*\{[^}]*error:\s*[^}]+\}\s*\}\)/gs,
      (match, message) => {
        hasChanges = true;
        return `await logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error' })`;
      }
    );

    // Pattern 6: Clean up any remaining malformed nested error objects
    content = content.replace(
      /\{\s*error:\s*\{\s*error:/g,
      () => {
        hasChanges = true;
        return "{ error:";
      }
    );

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed logger issues in ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  let totalFiles = 0;
  let updatedFiles = 0;

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const result = processDirectory(fullPath);
      totalFiles += result.totalFiles;
      updatedFiles += result.updatedFiles;
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
      totalFiles++;
      if (fixAllLoggerIssues(fullPath)) {
        updatedFiles++;
      }
    }
  }

  return { totalFiles, updatedFiles };
}

// Process app directory
console.log('📁 Processing app/ directory...');
const result = processDirectory('app');

console.log(`\n✅ Processed ${result.totalFiles} files`);
console.log(`✅ Updated ${result.updatedFiles} files`);

if (result.updatedFiles > 0) {
  console.log('\n📋 All Logger Issues Fixed!');
} else {
  console.log('\n📋 No logger issues found to fix.');
}


