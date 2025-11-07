const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing complex malformed logger calls...\n');

function fixComplexLoggerCalls(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;

    // Pattern 1: Complex nested ternary with malformed syntax
    const complexPattern1 = /logger\.error\('([^']+)',\s*\{\s*error:\s*\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'([^}]*)\}\s*\}\)/g;
    
    newContent = newContent.replace(complexPattern1, (match, message, extra) => {
      hasChanges = true;
      return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error'${extra} })`;
    });

    // Pattern 2: Similar but with different structure
    const complexPattern2 = /logger\.error\('([^']+)',\s*\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'([^}]*)\}\s*\}\)/g;
    
    newContent = newContent.replace(complexPattern2, (match, message, extra) => {
      hasChanges = true;
      return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error'${extra} })`;
    });

    // Pattern 3: Single line complex pattern
    const complexPattern3 = /logger\.error\('([^']+)',\s*\{\s*error:\s*\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'([^}]*)\}\s*\}\)/g;
    
    newContent = newContent.replace(complexPattern3, (match, message, extra) => {
      hasChanges = true;
      return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error'${extra} })`;
    });

    // Pattern 4: Another variation
    const complexPattern4 = /logger\.error\('([^']+)',\s*\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'([^}]*)\}\s*\}\)/g;
    
    newContent = newContent.replace(complexPattern4, (match, message, extra) => {
      hasChanges = true;
      return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error'${extra} })`;
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed complex logger calls in ${filePath}`);
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
      if (fixComplexLoggerCalls(fullPath)) {
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
  console.log('\n📋 Complex Logger Calls Fixed!');
} else {
  console.log('\n📋 No complex logger calls found to fix.');
}

