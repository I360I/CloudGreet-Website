const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing ALL malformed logger calls comprehensively...\n');

function fixAllMalformedLoggerCalls(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;

    // Pattern 1: Multi-line malformed logger calls
    const multilinePattern = /logger\.error\('([^']+)',\s*\{\s*error:\s*\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'([^}]*)\}\s*\}\)/gs;
    
    newContent = newContent.replace(multilinePattern, (match, message, extra) => {
      hasChanges = true;
      return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error'${extra} })`;
    });

    // Pattern 2: Single line malformed logger calls
    const singlelinePattern = /logger\.error\('([^']+)',\s*\{\s*error:\s*\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'([^}]*)\}\s*\}\)/g;
    
    newContent = newContent.replace(singlelinePattern, (match, message, extra) => {
      hasChanges = true;
      return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error'${extra} })`;
    });

    // Pattern 3: Another variation with different spacing
    const variationPattern = /logger\.error\('([^']+)',\s*\{\s*error:\s*\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'([^}]*)\}\s*\}\)/g;
    
    newContent = newContent.replace(variationPattern, (match, message, extra) => {
      hasChanges = true;
      return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error'${extra} })`;
    });

    // Pattern 4: Fix any remaining complex nested patterns
    const complexPattern = /error\.message\.replace\(\/\[<>\]\/g,\s*''\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'/g;
    
    newContent = newContent.replace(complexPattern, () => {
      hasChanges = true;
      return "error instanceof Error ? error.message : 'Unknown error'";
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed malformed logger calls in ${filePath}`);
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
      if (fixAllMalformedLoggerCalls(fullPath)) {
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
  console.log('\n📋 All Malformed Logger Calls Fixed!');
} else {
  console.log('\n📋 No malformed logger calls found to fix.');
}

