const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing remaining malformed logger patterns...\n');

function fixRemainingPatterns(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let hasChanges = false;

    // Fix the specific pattern: error.message.replace(/[<>]/g, '' instanceof Error ? { error: error instanceof Error ? error.message.replace(/[<>]/g, ''.message : 'Unknown error' }) : 'Unknown error'
    const pattern1 = /error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'/gs;
    
    content = content.replace(pattern1, () => {
      hasChanges = true;
      return "error instanceof Error ? error.message : 'Unknown error'";
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${path.relative(process.cwd(), filePath)}`);
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
      if (fixRemainingPatterns(fullPath)) {
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
  console.log('\n📋 Remaining Patterns Fixed!');
} else {
  console.log('\n📋 No issues found to fix.');
}


